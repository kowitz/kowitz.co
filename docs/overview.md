# kowitz.co — Overview

## What this is

A personal site for Braden Kowitz (kowitz.co) built around a terminal-style chat UI. Visitors land on what looks like a retro terminal in the browser and can ask questions about Braden — his background, experience, approach to design — by chatting with an assistant powered by Claude.

The site is a single-page Vite/React app. A small Netlify Function (`netlify/functions/chat.mts`) proxies chat requests to the Anthropic API so the API key never ships to the browser. The rest is static.

## Stack

- **Frontend**: Vite + React 19, rendered through `ink-web` (Ink, the React-for-CLIs renderer, running in the browser against xterm.js) for the terminal look and feel.
- **Backend**: a single Netlify Function written in TypeScript.
- **Model**: Claude Haiku 4.5 via `@anthropic-ai/sdk`.
- **Storage**: `@netlify/blobs` for rate-limit counters.
- **Telemetry**: LangSmith via `langsmith/wrappers` (`wrapSDK`) — opt-in by env var.

## Running locally

Prereqs: Node 20+, an Anthropic API key, optionally a LangSmith API key for tracing.

```
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY (and LANGSMITH_* if you want tracing)
npx netlify dev
```

Then open http://localhost:8888. Netlify Dev proxies the Vite dev server (5173) and the chat function (`/api/chat`) on port 8888, so use that URL — hitting 5173 directly will show a broken chat because the function won't be reachable.

## Key pieces

- `src/components/Terminal.tsx` — the chat UI. Uses Ink's `<Static>` to write completed messages and the banner to scrollback exactly once, and redraws only the live input line on each keystroke. This is what avoids xterm-scrollback duplicate-rendering when the chat grows long.
- `src/main.tsx` — React root. **StrictMode is intentionally disabled**; leaving it on causes ink-web to mount/unmount/remount, which loses the initial Static flush.
- `netlify/functions/chat.mts` — the chat endpoint. Loads the system prompt, enforces rate limits and input caps, streams the Anthropic response back to the client.
- `system-prompt/*.md` — system prompt, split into numbered files. Loaded in alphabetical order and concatenated with `---` separators. Edit existing files or drop in new numbered files (`015.something.md`); no code change required. Put stable content earlier (better prompt-cache reuse) and volatile / override content later.
- `netlify.toml` — build + functions config. `included_files` bundles `system-prompt/**/*.md` into the deployed function.

## Slash commands

Typed by the visitor in the chat:

- `/clear` — clears saved chat history (localStorage) and reloads the page. Reload is intentional: it's the only reliable way to wipe xterm's scrollback and re-flush the Static banner.
- `/retry` — re-sends the last user message if the previous request errored. No-op otherwise.
- Any other `/X` — responds with "Unknown command". Slash commands never hit the model.

## Rate limits

- **100 requests/hour per IP.** Returns 429 with a user-visible message.
- **1,000 requests/hour globally.** Returns 429 with a "high load" message.
- **4,000 chars per message**, **50 messages per conversation.** Both return 400.

Counters live in Netlify Blobs, keyed per hour. They roll over on their own — nothing to prune.

## LangSmith

Tracing is off by default. To turn it on locally:

```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=kowitz-co
```

The project name can be anything you choose; LangSmith auto-creates it on first trace. With tracing off, `wrapSDK(...)` is a no-op.

## Deploying

Env vars live in the Netlify UI (or push them with `netlify env:import .env`). Any push to the deploy branch triggers a build via the `npm run build` command in `netlify.toml`.

## Adding features

- **New system-prompt content**: drop a file into `system-prompt/` with a numbered prefix. That's it.
- **Tool use**: the Anthropic SDK handles this directly — pass a `tools` array in `messages.create`, handle `tool_use` content blocks, and post `tool_result` back in a follow-up message. LangSmith will trace the full loop automatically through `wrapSDK`.
- **Richer telemetry**: wrap server-side helpers in `traceable()` from `langsmith/traceable` if you want spans around non-model work (e.g. tool execution, retrieval).
