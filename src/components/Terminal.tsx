import { useState, useCallback, useEffect, useRef } from "react";
import { InkXterm, Box, Text, useInput } from "ink-web";
import "ink-web/css";
import "@xterm/xterm/css/xterm.css";

const BANNER = ` ___             _            _  __           _ _
| _ )_ _ __ _ __| |___ _ _   | |/ /_____ __ _(_) |_ ___
| _ \\ '_/ _\` / _\` / -_) ' \\  | ' </ _ \\ V  V / |  _|_ /
|___/_| \\__,_\\__,_\\___|_||_| |_|\\_\\___/\\_/\\_/|_|\\__/__|`;

const STORAGE_KEY = "kowitz-chat-messages";

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

function TerminalApp() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

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
        body: JSON.stringify({ messages: history }),
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

    if (trimmed.toLowerCase() === "clear") {
      setMessages([]);
      setStreamingText("");
      setError(null);
      saveMessages([]);
      setInput("");
      return;
    }

    if (trimmed.toLowerCase() === "retry" && error) {
      setError(null);
      sendMessage("", messages);
      setInput("");
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

  return (
    <Box flexDirection="column">
      <Text color="cyan">{BANNER}</Text>
      <Text> </Text>
      <Text>Product Design Leader.</Text>
      <Text> </Text>

      {messages.map((msg, i) => (
        <Box key={i} flexDirection="column">
          {msg.role === "user" ? (
            <Text><Text color="green">&gt;</Text> {msg.content}</Text>
          ) : (
            <Text>{msg.content}</Text>
          )}
          <Text> </Text>
        </Box>
      ))}

      {streaming && streamingText && (
        <Box flexDirection="column">
          <Text>{streamingText}<Text dimColor>▊</Text></Text>
          <Text> </Text>
        </Box>
      )}

      {streaming && !streamingText && (
        <Box flexDirection="column">
          <Text dimColor>Thinking...</Text>
          <Text> </Text>
        </Box>
      )}

      {error && (
        <Box flexDirection="column">
          <Text color="red">Error: {error}</Text>
          <Text dimColor>(Type "retry" to try again)</Text>
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
        }}
      >
        <TerminalApp />
      </InkXterm>
    </div>
  );
}
