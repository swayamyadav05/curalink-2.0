---
description: "Use when editing React, Vite, or Tailwind code in client/, especially chat UI, hooks, and API integration."
name: "CuraLink Client Conventions"
applyTo: "client/**/*.{ts,tsx,css}"
---

# Client Conventions

- Keep the frontend stack as React 19 + Vite + TypeScript.
- Keep the UI clean and medical-professional (light-first, readable spacing, clear hierarchy).
- Route all HTTP calls through client/src/lib/api.ts.
- Keep shared contracts and response typing in client/src/types/index.ts.
- Preserve the chat loading flow for long-running AI responses (15-30 seconds expected).
- Render assistant output as structured sections and source-backed cards.
- Keep layouts responsive for desktop and mobile.
- When changing request payloads for chat or context, coordinate matching updates in server routes and types.

References:

- [AGENTS](../../AGENTS.md)
- [INSTRUCTIONS](../../INSTRUCTIONS.md)
