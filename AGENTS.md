# AGENTS.md — CuraLink Development Guide

**Project:** CuraLink — AI Medical Research Assistant
**Deadline:** Monday noon, April 21, 2026 (Hackathon for Humanity)
**Tech Stack:** Node.js 24 (LTS), Express 5, React 19 (Vite), Mongoose 8.x+, Python 3.12+, FastAPI, AGNO, Ollama

---

## 🎯 Quick Context

CuraLink is a full-stack AI-powered medical research assistant. Users ask medical questions, and the system:

1. Expands queries intelligently using a local LLM (via AGNO + Ollama)
2. Fetches research from **PubMed, OpenAlex, and ClinicalTrials.gov** APIs
3. Ranks and filters 100-300 results down to top 6-8
4. Uses a local LLM to reason over results and generate structured responses
5. Maintains conversation context across turns

**Critical Success Criteria:**

- Use LATEST stable versions (Node.js 24, Express 5, React 19, Mongoose 8.x+, TypeScript 5.x+)
- Local LLM pipeline (AGNO + Ollama phi3:mini) — NOT OpenAI/Gemini
- Response time: 15-30 seconds per query (acceptable for local LLM)
- Structured, source-backed responses with citations
- Multi-turn conversations with context preservation

---

## 🏗️ Architecture

```
FRONTEND (React/Vite, Port 5173)
    ↓ HTTP
EXPRESS BACKEND (TypeScript, Port 3000)
    ↓ HTTP (internal)
FASTAPI + AGNO (Python, Port 8000)
    ↓
OLLAMA (phi3:mini, Port 11434)

+ MongoDB (Users, Conversations, Messages)
+ External APIs: PubMed, OpenAlex, ClinicalTrials.gov
```

**Key Integration Points:**

- Frontend → Express: Chat messages, user context updates
- Express → FastAPI: Research queries with disease, location, conversation history
- FastAPI → Ollama: Query expansion & reasoning
- FastAPI → External APIs: Research fetching (parallel with asyncio)

---

## 📁 Project Structure

```
curalink/
├── INSTRUCTIONS.md          # Full project spec (design, API endpoints, schemas)
├── AGENTS.md               # This file
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/     # ChatWindow, ChatInput, StructuredResponse, etc.
│   │   ├── hooks/          # useChat, useConversations
│   │   ├── lib/            # API helpers
│   │   └── types/          # TypeScript definitions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                 # Express Backend (TypeScript)
│   ├── src/
│   │   ├── index.ts        # Entry point
│   │   ├── app.ts          # Express app setup
│   │   ├── config/         # DB & env config
│   │   ├── models/         # User, Conversation, Message schemas
│   │   ├── routes/         # chat.routes, user.routes
│   │   ├── services/       # ai.service (calls FastAPI)
│   │   ├── middleware/     # Error handling
│   │   └── utils/          # ApiError, ApiResponse helpers
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── ai/                     # FastAPI + AGNO Backend (Python)
    ├── main.py             # FastAPI app entry
    ├── config.py           # Settings (OLLAMA_HOST, etc.)
    ├── agents/             # query_agent.py, reasoning_agent.py
    ├── services/           # pubmed.py, openalex.py, clinical_trials.py, ranker.py
    ├── schemas/            # Pydantic request/response models
    ├── requirements.txt    # Dependencies
    └── .env.example
```

---

## 🔄 Main API Flows

### Frontend → Express POST /api/chat

**Input:** User message + context (disease, location)

**Express Handler (server/src/routes/chat.routes.ts):**

1. Save user message to MongoDB
2. Find conversation history (last 5 messages)
3. Call FastAPI: `POST http://localhost:8000/api/research`
4. Save assistant response to MongoDB (with publications + trials)
5. Return response to frontend

**Key Business Logic:**

- If conversation exists, reuse it; else create new
- Pull disease from conversation.context if not explicitly provided
- Update conversation.context with new topics

### Express → FastAPI POST /api/research

**Input:** `{ query, disease, location, conversationHistory }`

**FastAPI Pipeline (ai/main.py):**

1. **Query Expansion** (AGNO Agent #1)
   - Input: user query + disease + conversation history
   - Output: 3-5 expanded search terms (JSON array)
   - Config: Ollama phi3:mini, no markdown, add history to context

2. **Parallel API Fetching** (pure Python, asyncio.gather())
   - PubMed search + fetch (NCBI eUtils)
   - OpenAlex search (REST API)
   - ClinicalTrials.gov search (REST API)
   - Fetch up to 50 publications + 30 trials total

3. **Ranking & Filtering** (pure Python, deterministic)
   - Deduplicate by title similarity
   - Score publications: title relevance (40%) + recency (30%) + citations (20%) + abstract (10%)
   - Score trials: status (30%) + location match (40%) + relevance (30%)
   - Return top 8 publications + top 5 trials

4. **Medical Reasoning** (AGNO Agent #2)
   - Input: user query + disease + location + ranked results
   - Output: structured JSON with overview, insights, trial summary
   - Config: Ollama phi3:mini, add history to context (5 runs)
   - **CRITICAL:** Agent must cite specific papers & trials, never hallucinate

**Return:** Structured response with publications array + trials array

---

## 📊 MongoDB Schemas

See [INSTRUCTIONS.md](INSTRUCTIONS.md) for full schema definitions. Key models:

- **User:** name, diseaseOfInterest, location, timestamps
- **Conversation:** userId, title, context (disease, topics), timestamps
- **Message:** conversationId, role (user|assistant), content, structured (overview, insights, trialSummary), publications[], clinicalTrials[], timestamps

---

## 🛠️ Build Order & Checkpoints

### Day 1: Foundation

1. Initialize Express + MongoDB connection
2. Create MongoDB models (User, Conversation, Message)
3. Build Express routes (placeholder responses)
4. Set up React/Vite + Tailwind
5. Build chat UI components
6. **Checkpoint:** Can send message and see it in MongoDB

### Day 2: AI Pipeline

7. Set up FastAPI + AGNO agents
8. Build API fetchers (PubMed, OpenAlex, ClinicalTrials)
9. Build ranking/filtering logic
10. Test full FastAPI pipeline locally
11. Connect Express ↔ FastAPI
12. **Checkpoint:** End-to-end query: message → FastAPI → structured response

### Day 3: Polish & Context

13. Build StructuredResponse, ResearchCard, TrialCard components
14. Add loading indicator with step descriptions
15. Implement conversation context handling
16. Build sidebar (ConversationList, ContextPanel)
17. Deploy to Vercel (frontend), Render/Railway (backend)
18. **Checkpoint:** Full working prototype, Loom demo video

---

## 🔑 Important Details

### Response Time Expectations

- Query expansion: 3-5 sec
- API fetching (parallel): 2-4 sec
- Ranking/filtering: <1 sec
- LLM reasoning: 8-15 sec
- **TOTAL: ~15-25 seconds per query** ✅ Acceptable
- Add step-by-step loading indicator so evaluators see progress

### Context Handling (Multi-turn Conversations)

- First message: "Latest treatment for lung cancer"
  → Extract/set `conversation.context.disease = "lung cancer"`
- Second message: "Can I take Vitamin D?"
  → No disease mentioned, so pull from `conversation.context.disease`
  → Send to FastAPI: `{ query: "Vitamin D", disease: "lung cancer", history: [...] }`

### Deployment Strategy

- **Frontend:** Vercel (free)
- **Express Backend:** Render or Railway (free tier)
- **FastAPI + AGNO:** Render or Railway (free tier)
- **LLM Runtime:**
  - Local: Ollama (for demo video, shows custom LLM pipeline)
  - Deployed: Groq free tier or HuggingFace Inference API (open-source models only)
  - MENTION this tradeoff in Loom video — shows engineering maturity

---

## 🚀 Key Commands

```bash
# Frontend
cd client && npm install && npm run dev      # Vite dev server (port 5173)
npm run build                                # Production build

# Express Backend
cd server && npm install && npm run dev      # TypeScript watch + nodemon (port 3000)

# FastAPI + AGNO
cd ai && python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py                              # FastAPI server (port 8000)

# Ollama (separate terminal)
ollama serve                                # Ensure Ollama is running (port 11434)
ollama pull phi3:mini                       # Pull model if not already present
```

---

## 💡 Common Tasks & Patterns

### Adding a New Frontend Component

1. Create file in `client/src/components/ComponentName.tsx`
2. Use TypeScript interfaces from `client/src/types/index.ts`
3. Style with Tailwind CSS (see `client/src/index.css` for config)
4. Example: ResearchCard displays publication metadata + link

### Adding a New API Fetcher (FastAPI)

1. Create service in `ai/services/new_source.py`
2. Implement async function that:
   - Takes search terms
   - Calls external API (requests, aiohttp, httpx)
   - Returns list of `{ title, authors, year, url, abstract?, citation_count? }`
3. Import + call in `ai/main.py` pipeline via `asyncio.gather()`
4. Test with sample queries

### Updating AGNO Agent Instructions

1. Edit `ai/agents/query_agent.py` or `ai/agents/reasoning_agent.py`
2. Modify the `instructions` list
3. Restart FastAPI server
4. Test prompt → output manually before deploying
5. Keep outputs deterministic (JSON only) for parsing

### Debugging Multi-turn Context

1. Check `conversation.context` in MongoDB for disease/topics
2. Check Express logs: is it sending full conversation history to FastAPI?
3. Check AGNO agent: is `add_history_to_context=True`?
4. Test: send message 1, check context; send message 2, verify disease is pulled

---

## ✅ Quality Checklist Before Submission

- [ ] Node.js 24, Express 5, React 19 (latest stable)
- [ ] MongoDB schemas match [INSTRUCTIONS.md](INSTRUCTIONS.md)
- [ ] All Express endpoints implemented
- [ ] All FastAPI endpoints implemented
- [ ] Both AGNO agents configured with Ollama
- [ ] PubMed, OpenAlex, ClinicalTrials API integrations working
- [ ] Ranking/filtering logic produces top 8 + top 5
- [ ] Frontend renders publications + trials as cards
- [ ] Multi-turn conversations preserve disease context
- [ ] Loading indicator shows step-by-step progress
- [ ] Deployed on Vercel + Render/Railway
- [ ] Loom video (3-5 min) explaining architecture + demo
- [ ] README.md complete with setup, architecture, API docs

---

## 🎯 Success Metrics

1. **Functional:** End-to-end query from chat → structured response with sources
2. **Performance:** Response time 15-30 sec acceptable for local LLM
3. **Context:** Multi-turn conversations use disease history correctly
4. **Design:** Clean, professional UI (no fancy animations)
5. **Deployment:** Live on free tier with Vercel + Render/Railway
6. **Video:** Clear Loom explaining architecture + showing local LLM pipeline

---

## 📚 References

- Full project spec: [INSTRUCTIONS.md](INSTRUCTIONS.md)
- AGNO docs: https://docs.agno.com/
- Ollama: https://docs.ollama.com/
- Mongoose: https://mongoosejs.com
- FastAPI: https://fastapi.tiangolo.com
- PubMed eUtils: https://www.ncbi.nlm.nih.gov/books/NBK25499/
- OpenAlex: https://docs.openalex.org
- ClinicalTrials.gov API: https://clinicaltrials.gov/api/gui

---

## 🤖 Chat Customizations In This Repo

- File instructions:
  - `.github/instructions/client.instructions.md`
  - `.github/instructions/server.instructions.md`
  - `.github/instructions/ai.instructions.md`
- Prompt files:
  - `.github/prompts/add-research-source.prompt.md`
  - `.github/prompts/debug-context-regression.prompt.md`
- Skill:
  - `.github/skills/curalink-feature-delivery/SKILL.md`
- Custom agent:
  - `.github/agents/curalink-review.agent.md`
