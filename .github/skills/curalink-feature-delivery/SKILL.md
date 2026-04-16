---
name: curalink-feature-delivery
description: "Implement or refactor end-to-end CuraLink features spanning React client, Express server, and FastAPI AI pipeline. Use for cross-layer changes, API contract alignment, and context-safe chat updates."
argument-hint: "Feature request or refactor scope"
user-invocable: true
---

# CuraLink Feature Delivery

## When to Use

- End-to-end features that touch client, server, and ai services.
- Chat flow changes that impact message storage or context propagation.
- Contract updates between Express and FastAPI.

## Procedure

1. Read project intent and constraints in [AGENTS](../../../AGENTS.md) and [INSTRUCTIONS](../../../INSTRUCTIONS.md).
2. Map impact by layer before editing:
   - Client UI/types/API calls
   - Server routes/models/services
   - AI schemas/pipeline/services
3. Update API contracts first, then implementation.
4. Keep ranking deterministic and citation-backed; do not move ranking into LLM prompts.
5. Validate each touched layer with the lightest meaningful checks.
6. Report changed files, behavior delta, and any unresolved risk.

## Guardrails

- Keep architecture direction: client -> server -> ai.
- Preserve disease/location context fallback behavior in multi-turn chat.
- Prefer minimal diffs and do not reformat unrelated code.

## Deliverable Checklist

- Contract compatibility confirmed
- Context handling verified
- Source grounding preserved
- Verification steps documented
