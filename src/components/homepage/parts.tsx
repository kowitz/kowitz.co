import {
  IconSearch,
  IconPlus,
  IconBolt,
  IconMessage,
  IconFile,
  IconFolder,
  IconMenu,
  IconClose,
  IconSend,
  IconMore,
} from "./Icons";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─────────────────────────────────────────────────────────────
// Menubar (top macOS-ish strip)
// ─────────────────────────────────────────────────────────────
export function Menubar({ title = "~/braden-kowitz — chat" }: { title?: string }) {
  return (
    <div className="hp-menubar">
      <div className="hp-traffic">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
      </div>
      <span className="hp-menu-item">kowitz.co</span>
      <span className="hp-menu-item">File</span>
      <span className="hp-menu-item">Edit</span>
      <span className="hp-menu-item">View</span>
      <span className="hp-menu-item">Go</span>
      <span className="hp-menu-item">Help</span>
      <div className="hp-menu-title">
        <span>{title}</span>
        <span className="sep">·</span>
        <span>main</span>
      </div>
      <div className="hp-menu-actions">
        <IconSearch size={12} />
        <IconBolt size={12} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ActivityBar (left icon strip)
// ─────────────────────────────────────────────────────────────
export function ActivityBar({ initials = "BK" }: { initials?: string }) {
  return (
    <nav className="hp-activity">
      <div className="hp-act-btn active" title="Chat">
        <IconMessage size={16} />
      </div>
      <div className="hp-act-btn" title="Files">
        <IconFile size={16} />
      </div>
      <div className="hp-act-spacer" />
      <div className="hp-act-foot">
        <div className="hp-avatar">{initials}</div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat history (top of rail)
// ─────────────────────────────────────────────────────────────
export interface ChatListItem {
  id: string;
  title: string;
  when: string;
  preview?: string;
  active?: boolean;
}

export function ChatHistoryPanel({ chats }: { chats: ChatListItem[] }) {
  return (
    <section className="hp-rail-section">
      <header className="hp-rail-head">
        <span>
          chats <span className="count">({chats.length})</span>
        </span>
        <button className="btn" title="New chat" aria-label="new chat">
          <IconPlus size={12} />
        </button>
      </header>
      <div className="hp-rail-body">
        {chats.map((c) => (
          <div key={c.id} className={"hp-chat-row" + (c.active ? " active" : "")}>
            <span className="glyph">❯</span>
            <span className="title">{c.title}</span>
            <span className="when">{c.when}</span>
            {c.preview && <span className="preview">{c.preview}</span>}
          </div>
        ))}
        {chats.length === 0 && (
          <div style={{ padding: "12px", color: "var(--fg-3)", fontSize: "11.5px" }}>
            no chats yet
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// File tree (bottom of rail)
// ─────────────────────────────────────────────────────────────
export interface FileNode {
  kind: "folder" | "file";
  id: string;
  name: string;
  open?: boolean;
  children?: FileNode[];
}

function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const pad = 10 + depth * 12;
  if (node.kind === "folder") {
    return (
      <div>
        <div className="hp-tree-row" style={{ paddingLeft: pad }}>
          <span className="hp-tree-chev">{node.open ? "▾" : "▸"}</span>
          <span className="hp-tree-icon">
            <IconFolder size={12} />
          </span>
          <span className="hp-tree-name">{node.name}</span>
        </div>
        {node.open &&
          node.children?.map((c) => <FileTreeItem key={c.id} node={c} depth={depth + 1} />)}
      </div>
    );
  }
  return (
    <div className="hp-tree-row" style={{ paddingLeft: pad }}>
      <span className="hp-tree-chev" />
      <span className="hp-tree-icon">
        <IconFile size={12} />
      </span>
      <span className="hp-tree-name">{node.name}</span>
    </div>
  );
}

export function FileTreePanel({ files }: { files: FileNode[] }) {
  return (
    <section className="hp-rail-section">
      <header className="hp-rail-head">
        <span>
          files <span className="count">({files.length})</span>
        </span>
      </header>
      <div className="hp-rail-body hp-tree">
        {files.map((f) => (
          <FileTreeItem key={f.id} node={f} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────
export interface Tab {
  id: string;
  name: string;
  active?: boolean;
  dirty?: boolean;
}

export function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="hp-tabs">
      {tabs.map((t) => (
        <div key={t.id} className={"hp-tab" + (t.active ? " active" : "") + (t.dirty ? " dirty" : "")}>
          <span className="dot" />
          <span>{t.name}</span>
          <button className="x" aria-label={`close ${t.name}`}>
            <IconClose size={10} />
          </button>
        </div>
      ))}
      <div className="hp-tabs-actions">
        <button className="btn" aria-label="more">
          <IconMore size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Breadcrumb
// ─────────────────────────────────────────────────────────────
export function Crumbs({ path, meta }: { path: string[]; meta?: string }) {
  return (
    <div className="hp-crumbs">
      {path.map((p, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className="sep">/</span>}
          <span className={"crumb" + (i === path.length - 1 ? " leaf" : "")}>{p}</span>
        </span>
      ))}
      <span className="spacer" />
      {meta && <span className="meta">{meta}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat stream
// ─────────────────────────────────────────────────────────────
export function EmptyState() {
  return (
    <div className="hp-empty">
      <div className="name">Braden Kowitz</div>
      <div className="role">Product Design Leader</div>
    </div>
  );
}

export function ChatStream({
  messages,
  streaming,
  streamingText,
  error,
  scrollRef,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  streamingText: string;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isEmpty = messages.length === 0 && !streaming && !error;

  return (
    <div className="hp-stream" ref={scrollRef}>
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="msg msg-user">
                <div className="gut">❯</div>
                <div className="text">{msg.content}</div>
              </div>
            ) : (
              <div key={i} className="msg">
                {msg.content}
              </div>
            ),
          )}
          {streaming && (
            <div className="msg">
              {streamingText}
              <span className="cursor-inline" />
            </div>
          )}
          {error && (
            <div className="msg" style={{ color: "var(--danger)" }}>
              error: {error}
              <div style={{ color: "var(--fg-3)", fontSize: "12px", marginTop: "4px" }}>
                type /retry to try again
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composer
// ─────────────────────────────────────────────────────────────
export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "reply…",
  showHint = true,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
  showHint?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="hp-composer-wrap">
      <div className="hp-composer">
        <span className="prompt">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <button className="send" onClick={onSubmit} disabled={disabled} aria-label="send">
          <IconSend size={12} />
        </button>
      </div>
      {showHint && (
        <div className="hp-composer-hint">
          <div className="group">
            <kbd>enter</kbd>
            <span>send</span>
          </div>
          <div className="group">
            <span>/ for commands</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
export function StatusBar({
  msgCount,
  streaming,
  compact,
}: {
  msgCount: number;
  streaming?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="hp-status">
        <div className="left">
          <div className="chip branch">main</div>
          <div className="chip">{msgCount} msgs</div>
        </div>
        <div className="right">
          <div className="chip">{streaming ? "…" : "ready"}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="hp-status">
      <div className="left">
        <div className="chip branch">⎇ main</div>
        <div className="chip">kowitz.co</div>
        <div className="chip diag">{msgCount} messages</div>
      </div>
      <div className="right">
        <div className="chip">{streaming ? "streaming…" : "ready"}</div>
        <div className="chip">utf-8</div>
        <div className="chip">80×24</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile header
// ─────────────────────────────────────────────────────────────
export function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="hp-mob-header">
      <button className="btn" onClick={onMenu} aria-label="menu">
        <IconMenu size={18} />
      </button>
      <span className="brand">
        ~/<span style={{ color: "var(--accent)" }}>kowitz.co</span>
      </span>
      <span className="spacer" />
      <button className="btn" aria-label="search">
        <IconSearch size={16} />
      </button>
      <button className="btn" aria-label="new chat">
        <IconPlus size={16} />
      </button>
    </header>
  );
}

export function MobileDrawer({
  open,
  onClose,
  chats,
  files,
}: {
  open: boolean;
  onClose: () => void;
  chats: ChatListItem[];
  files?: FileNode[];
}) {
  if (!open) return null;
  return (
    <>
      <div className="hp-sheet-scrim" onClick={onClose} />
      <div className="hp-sheet" role="dialog" aria-label="menu">
        <div className="hp-sheet-head">
          <span className="brand">
            ~/<span style={{ color: "var(--accent)" }}>kowitz.co</span>
          </span>
          <button className="close" onClick={onClose} aria-label="close">
            <IconClose size={14} />
          </button>
        </div>
        <ChatHistoryPanel chats={chats} />
        {files && <FileTreePanel files={files} />}
      </div>
    </>
  );
}
