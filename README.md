# kowitz.co

Personal website for Braden Kowitz.
View site at: https://kowitz.co.
Deployed and hosted with [Netlify](netlify.com).

## Chat Agent

The site includes a terminal-based chat agent powered by Claude (Anthropic API).

### Setup

1. Copy `.env.example` to `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. On Netlify, set the same `ANTHROPIC_API_KEY` env var in **Site settings > Environment variables**.

### System Prompt

Edit `system-prompt.md` at the project root to customize what the assistant knows. This file is sent as the system prompt to Claude on every request.

### Local Development

```bash
npm install
npx netlify dev
```

This starts Vite on port 5173 and the Netlify dev server (with functions) on port 8888. Open http://localhost:8888.

### Deploy

Push to the connected branch. Netlify builds with `npm run build` and deploys from `dist/`.
