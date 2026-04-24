import { useState, useCallback, useEffect, useRef } from "react";
import "../styles/colors_and_type.css";
import "../styles/homepage.css";
import {
  ChatHistoryPanel,
  FileTreePanel,
  TabBar,
  Crumbs,
  ChatStream,
  Composer,
  StatusBar,
  MobileHeader,
  MobileDrawer,
  type ChatMessage,
  type ChatListItem,
  type FileNode,
} from "./homepage/parts";

const STORAGE_KEY = "kowitz-chat-messages";
const CONVERSATION_ID_KEY = "kowitz-conversation-id";

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

// Stub sidebar content — the chat features aren't wired up yet, but the
// UI shows what the finished product will look like.
const STUB_FILES: FileNode[] = [
  { kind: "file", id: "readme", name: "README.md" },
  { kind: "file", id: "resume", name: "resume.md" },
  { kind: "file", id: "about", name: "about.md" },
  { kind: "file", id: "contact", name: "contact.md" },
  {
    kind: "folder",
    id: "projects",
    name: "projects",
    open: true,
    children: [
      { kind: "file", id: "acme", name: "acme.md" },
      { kind: "file", id: "fizz", name: "fizz.md" },
    ],
  },
  {
    kind: "folder",
    id: "writing",
    name: "writing",
    children: [{ kind: "file", id: "latency", name: "on-latency.md" }],
  },
];

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string>(loadConversationId());
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-scroll chat to bottom when content grows.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, streaming]);

  const sendMessage = useCallback(
    async (userInput: string, retryMessages?: ChatMessage[]) => {
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
          body: JSON.stringify({
            messages: history,
            conversationId: conversationIdRef.current,
          }),
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
    },
    [messages],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

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
          setError("Nothing to retry");
        }
        return;
      }

      setError(`Unknown command: /${command}`);
      return;
    }

    setInput("");
    sendMessage(trimmed);
  }, [input, streaming, sendMessage, error, messages]);

  // Build a single chat list item reflecting the current session so the
  // rail isn't empty. Multi-chat history is a future feature.
  const currentTitle =
    messages.find((m) => m.role === "user")?.content.slice(0, 40) || "new chat";
  const chats: ChatListItem[] = [
    {
      id: "current",
      title: currentTitle,
      when: "now",
      active: true,
      preview: messages.length > 0 ? `${messages.length} msgs` : undefined,
    },
  ];

  const isEntry = messages.length === 0;
  const placeholder = isEntry ? "ask me anything · type / for commands" : "reply…";

  if (isMobile) {
    return (
      <div className="hp-app mobile">
        <MobileHeader onMenu={() => setDrawerOpen(true)} />
        <div className="hp-mob-body">
          <div className="hp-mob-tabs">
            <div className="hp-mob-tab active">
              <span>❯</span> {isEntry ? "new chat" : currentTitle}
            </div>
          </div>
          <ChatStream
            messages={messages}
            streaming={streaming}
            streamingText={streamingText}
            error={error}
            scrollRef={scrollRef}
          />
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={streaming}
            placeholder={placeholder}
            showHint={false}
            inputRef={inputRef}
          />
        </div>
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          chats={chats}
          files={STUB_FILES}
        />
        <StatusBar msgCount={messages.length} streaming={streaming} compact />
      </div>
    );
  }

  return (
    <div className="hp-app">
      <div className="hp-body" style={{ ["--rail-w" as string]: "264px" }}>
        <aside className="hp-rail">
          <ChatHistoryPanel chats={chats} />
          <div className="hp-rail-divider" />
          <FileTreePanel files={STUB_FILES} />
        </aside>
        <main className="hp-main">
          <TabBar
            tabs={[
              {
                id: "chat",
                name: isEntry ? "Hello" : currentTitle,
                active: true,
                dirty: streaming,
              },
            ]}
          />
          <Crumbs
            path={["~", "braden-kowitz", isEntry ? "Hello" : "chat"]}
            meta={`${isEntry ? "new session" : "session"} · 80×24 · utf-8`}
          />
          <div className="hp-content">
            <div className="hp-chat">
              <ChatStream
                messages={messages}
                streaming={streaming}
                streamingText={streamingText}
                error={error}
                scrollRef={scrollRef}
              />
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                disabled={streaming}
                placeholder={placeholder}
                inputRef={inputRef}
              />
            </div>
          </div>
        </main>
      </div>
      <StatusBar msgCount={messages.length} streaming={streaming} />
    </div>
  );
}
