import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { InkXterm, Box, Static, Text, useInput } from "ink-web";
import "ink-web/css";
import "@xterm/xterm/css/xterm.css";

const BANNER = ` ___             _            _  __           _ _
| _ )_ _ __ _ __| |___ _ _   | |/ /_____ __ _(_) |_ ___
| _ \\ '_/ _\` / _\` / -_) ' \\  | ' </ _ \\ V  V / |  _|_ /
|___/_| \\__,_\\__,_\\___|_||_| |_|\\_\\___/\\_/\\_/|_|\\__/__|`;

const STORAGE_KEY = "kowitz-chat-messages";
const CONVERSATION_ID_KEY = "kowitz-conversation-id";
const SPINNER_FRAMES = ["|", "/", "-", "\\"] as const;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function loadMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

function loadConversationId(): string {
  try {
    const existing = localStorage.getItem(CONVERSATION_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    localStorage.setItem(CONVERSATION_ID_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

function TerminalApp() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string>(loadConversationId());
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (!streaming || streamingText) return;
    const id = setInterval(() => {
      setSpinnerFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 1200 / SPINNER_FRAMES.length);
    return () => clearInterval(id);
  }, [streaming, streamingText]);

  const sendMessage = useCallback(async (userInput: string, retryMessages?: ChatMessage[]) => {
    const newUserMessage: ChatMessage = { role: "user", content: userInput };
    const history = retryMessages ?? [...messages, newUserMessage];

    if (!retryMessages) {
      setMessages(history);
    }

    setStreaming(true);
    setStreamingText("");
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, conversationId: conversationIdRef.current }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamingText(fullText);
      }

      const assistantMessage: ChatMessage = { role: "assistant", content: fullText };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingText("");
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || "Something went wrong");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages]);

  const handleSubmit = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("/")) {
      const command = trimmed.slice(1).toLowerCase().split(/\s+/)[0];
      setInput("");

      if (command === "clear") {
        saveMessages([]);
        try {
          localStorage.removeItem(CONVERSATION_ID_KEY);
        } catch {}
        window.location.reload();
        return;
      }

      if (command === "retry") {
        if (error) {
          setError(null);
          sendMessage("", messages);
        } else {
          setError(`Nothing to retry`);
        }
        return;
      }

      setError(`Unknown command: /${command}`);
      return;
    }

    setInput("");
    sendMessage(trimmed);
  }, [sendMessage, error, messages]);

  useInput((ch: string, key: { return: boolean; backspace: boolean; delete: boolean; ctrl: boolean; meta: boolean }) => {
    if (streaming) return;

    if (key.return) {
      handleSubmit(input);
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else if (ch && !key.ctrl && !key.meta) {
      setInput((prev) => prev + ch);
    }
  });

  const showPlaceholder = input.length === 0 && messages.length === 0 && !streaming;

  type StaticItem =
    | { key: string; kind: "banner" }
    | { key: string; kind: "message"; msg: ChatMessage };
  const staticItems = useMemo<StaticItem[]>(
    () => [
      { key: "banner", kind: "banner" },
      ...messages.map((msg, i) => ({ key: `msg-${i}`, kind: "message" as const, msg })),
    ],
    [messages],
  );

  return (
    <Box flexDirection="column">
      <Static items={staticItems}>
        {(item) =>
          item.kind === "banner" ? (
            <Box key={item.key} flexDirection="column">
              <Text color="cyan">{BANNER}</Text>
              <Text> </Text>
              <Text>Product Design Leader.</Text>
              <Text> </Text>
            </Box>
          ) : (
            <Box key={item.key} flexDirection="column">
              {item.msg.role === "user" ? (
                <Text>
                  <Text color="green">&gt;</Text> {item.msg.content}
                </Text>
              ) : (
                <Text>{item.msg.content}</Text>
              )}
              <Text> </Text>
            </Box>
          )
        }
      </Static>

      {streaming && streamingText && (
        <Box flexDirection="column">
          <Text>{streamingText}<Text dimColor>▊</Text></Text>
          <Text> </Text>
        </Box>
      )}

      {streaming && !streamingText && (
        <Box flexDirection="column">
          <Text dimColor>{SPINNER_FRAMES[spinnerFrame]}</Text>
          <Text> </Text>
        </Box>
      )}

      {error && (
        <Box flexDirection="column">
          <Text color="red">Error: {error}</Text>
          <Text dimColor>(Type "/retry" to try again)</Text>
          <Text> </Text>
        </Box>
      )}

      {!streaming && (
        <Text>
          <Text color="green">&gt;</Text>{" "}
          {showPlaceholder ? (
            <Text dimColor>(Type anything to get started)</Text>
          ) : (
            <>
              {input}
              <Text dimColor>█</Text>
            </>
          )}
        </Text>
      )}
    </Box>
  );
}

export default function Terminal() {
  return (
    <div style={{ width: "100%", height: "100%", padding: 64, background: "#1e1e1e" }}>
      <InkXterm
        focus
        termOptions={{
          theme: {
            background: "#1e1e1e",
            foreground: "#d4d4d4",
            cursor: "#d4d4d4",
          },
          fontFamily: "'Courier New', 'Consolas', monospace",
          fontSize: 18,
          cols: 60,
          rows: 10,
        }}
      >
        <TerminalApp />
      </InkXterm>
    </div>
  );
}
