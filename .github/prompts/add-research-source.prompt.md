---
description: "Add a new external medical research source to the FastAPI pipeline, map it into ranking, and expose it to frontend cards safely."
name: "Add Research Source"
argument-hint: "Source name, endpoint docs, and returned fields"
agent: "agent"
---

Integrate the new research source described in the user argument into CuraLink.

Requirements:

1. Follow existing architecture boundaries (client -> server -> ai).
2. Implement source fetcher under ai/services/ with async I/O and clear response mapping.
3. Wire the fetcher into the ai/main.py orchestration with parallel execution.
4. Extend deterministic ranking logic only if needed and document scoring impact.
5. Keep reasoning input grounded in fetched data only; do not fabricate citations.
6. Update backend/client contracts only when required by the new source fields.
7. Add or update tests and sanity checks relevant to touched modules.

Output format:

- Summary of changed files
- API contract changes (if any)
- Validation steps run
- Follow-up risks or TODOs

References:

- [AGENTS](../../AGENTS.md)
- [INSTRUCTIONS](../../INSTRUCTIONS.md)
