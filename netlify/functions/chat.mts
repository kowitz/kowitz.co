import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import { wrapAnthropic } from "langsmith/wrappers/anthropic";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadSystemPrompt(): string {
  try {
    const dir = join(process.cwd(), "system-prompt");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    if (files.length === 0) return "You are a helpful assistant.";
    return files
      .map((f) => readFileSync(join(dir, f), "utf-8").trim())
      .join("\n\n---\n\n");
  } catch {
    return "You are a helpful assistant.";
  }
}

const systemPrompt = loadSystemPrompt();

const anthropic = wrapAnthropic(new Anthropic());

const PER_IP_HOURLY_LIMIT = 100;
const GLOBAL_HOURLY_LIMIT = 1000;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CONVERSATION_LENGTH = 50;

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getClientIp(req: Request): string {
  const nfIp = req.headers.get("x-nf-client-connection-ip");
  if (nfIp) return nfIp;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

function minutesUntilNextHour(): number {
  const msIntoHour = Date.now() % 3_600_000;
  return Math.max(1, Math.ceil((3_600_000 - msIntoHour) / 60_000));
}

type RateLimitResult = { ok: true } | { ok: false; message: string };

async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  let store;
  try {
    store = getStore("rate-limits");
  } catch {
    return { ok: true };
  }

  const hourStamp = Math.floor(Date.now() / 3_600_000);
  const ipKey = `ip:${ip}:${hourStamp}`;
  const globalKey = `global:${hourStamp}`;

  const [ipCountRaw, globalCountRaw] = await Promise.all([
    store.get(ipKey),
    store.get(globalKey),
  ]);
  const ipCount = ipCountRaw ? parseInt(ipCountRaw, 10) || 0 : 0;
  const globalCount = globalCountRaw ? parseInt(globalCountRaw, 10) || 0 : 0;

  const mins = minutesUntilNextHour();

  if (ipCount >= PER_IP_HOURLY_LIMIT) {
    return {
      ok: false,
      message: `Rate limit exceeded (${PER_IP_HOURLY_LIMIT}/hour per visitor). Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }
  if (globalCount >= GLOBAL_HOURLY_LIMIT) {
    return {
      ok: false,
      message: `The site is experiencing high load. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  await Promise.all([
    store.set(ipKey, String(ipCount + 1)),
    store.set(globalKey, String(globalCount + 1)),
  ]);

  return { ok: true };
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: Message[]; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.length <= 128
      ? body.conversationId
      : undefined;

  if (body.messages.length > MAX_CONVERSATION_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Conversation too long (max ${MAX_CONVERSATION_LENGTH} messages). Type /clear to start over.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  for (const msg of body.messages) {
    if (typeof msg?.content !== "string" || msg.content.length > MAX_MESSAGE_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Message too long (max ${MAX_MESSAGE_CHARS} characters).`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const ip = getClientIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: rl.message }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const lastUserMessage =
      [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const runName =
      lastUserMessage.length > 80
        ? `${lastUserMessage.slice(0, 80)}…`
        : lastUserMessage || "chat-turn";

    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: body.messages,
        stream: true,
      },
      {
        langsmithExtra: {
          name: runName,
          metadata: {
            ...(conversationId
              ? { session_id: conversationId, thread_id: conversationId }
              : {}),
            user_message: lastUserMessage,
            turn_index: body.messages.filter((m) => m.role === "user").length,
          },
        },
      },
    );

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    console.error("Chat function error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = (err as { status?: number }).status || 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/chat",
};
