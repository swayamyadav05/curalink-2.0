---
description: "Use when editing Express backend code in server/, including routes, models, context handling, and FastAPI integration."
name: "CuraLink Server Conventions"
applyTo: "server/**/*.ts"
---

# Server Conventions

- Keep backend stack as Express 5 + TypeScript 5 + Mongoose 8.
- Keep routes thin: parse/validate input, delegate logic to services, and return normalized API responses.
- For chat flow, preserve the sequence: save user message, read history, call AI service, save assistant message, update conversation context.
- Preserve multi-turn behavior: if disease is omitted in a new message, fallback to conversation.context.disease.
- Send only the recent conversation window (last 5 messages) to the AI service unless a change is explicitly requested.
- Keep error handling centralized via middleware and typed error helpers.
- Do not bypass the backend from the client for external research APIs.

References:

- [AGENTS](../../AGENTS.md)
- [INSTRUCTIONS](../../INSTRUCTIONS.md)
