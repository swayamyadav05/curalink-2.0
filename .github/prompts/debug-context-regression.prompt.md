---
description: "Diagnose and fix multi-turn context regressions where disease/location context is lost or incorrectly applied in chat responses."
name: "Debug Context Regression"
argument-hint: "Symptom and reproduction steps"
agent: "agent"
---

Investigate and resolve a conversation-context regression in CuraLink using the user-provided symptom.

Checklist:

1. Reproduce with two-turn or three-turn chat scenarios.
2. Trace context state across conversation storage, server routing, and AI request payload.
3. Verify fallback logic for disease/location when omitted in follow-up questions.
4. Verify conversationHistory window selection and ordering.
5. Fix the minimal set of files and preserve existing API contracts unless explicitly needed.
6. Add focused regression tests or test notes for the exact failing path.

Return:

- Root cause
- Exact fix applied
- How to verify with a concrete message sequence

References:

- [AGENTS](../../AGENTS.md)
- [INSTRUCTIONS](../../INSTRUCTIONS.md)
