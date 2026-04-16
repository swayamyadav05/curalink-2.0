---
description: "Use when editing FastAPI, AGNO agents, or research services in ai/, including query expansion, ranking, and reasoning output shaping."
name: "CuraLink AI Pipeline Conventions"
applyTo: "ai/**/*.py"
---

# AI Pipeline Conventions

- Keep the pipeline architecture: query expansion, parallel fetch, deterministic ranking, and reasoning synthesis.
- Use AGNO with Ollama phi3:mini for local workflow unless deployment constraints require a documented fallback.
- Keep query-expander output strict and machine-parseable (JSON array only).
- Keep reasoning output strict and machine-parseable (overview, insights, trialSummary plus structured sources).
- Keep ranking deterministic and code-based; do not shift ranking decisions into LLM prompts.
- Fetch PubMed, OpenAlex, and ClinicalTrials.gov in parallel with asyncio.gather where possible.
- Avoid unsupported medical claims and avoid citations not present in fetched source data.

References:

- [AGENTS](../../AGENTS.md)
- [INSTRUCTIONS](../../INSTRUCTIONS.md)
