# CLAUDE.md

This repo is a personal site for Braden Kowitz built as a terminal-style chat UI (Vite + React + ink-web on xterm.js) with a Netlify Function that proxies streaming chat to the Anthropic API.

Before making non-trivial changes, read `docs/overview.md` — it covers the stack, how to run the dev server, the Static-render approach that prevents scrollback duplicates, the system-prompt folder convention, and the rate-limit / telemetry setup.
