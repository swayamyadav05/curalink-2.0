# CURALINK — AI Medical Research Assistant

# Hackathon for Humanity Founders | AI Engineer (Full Stack) Role

# Deadline: Monday noon, April 21, 2026

# Goal: WIN this hackathon and get the full-time job offer

CRITICAL: Use LATEST stable versions of ALL packages. Node.js 24(LTS), Express 5, React 19, Next.js is NOT needed — use Vite + React. Mongoose 8.x+, TypeScript 5.x+ for Express. Python 3.12+ for FastAPI/AGNO.

## WHAT WE'RE BUILDING

A full-stack AI-powered Medical Research Assistant that:

1. Takes user medical queries (disease + intent + location)
2. Expands queries intelligently using a local LLM
3. Fetches research from PubMed, OpenAlex, and ClinicalTrials.gov APIs
4. Ranks and filters 100-300 results down to top 6-8
5. Uses a local LLM (via AGNO framework + Ollama) to reason over results
6. Delivers structured, source-backed responses
7. Maintains context across conversations

## ARCHITECTURE

```
┌─────────────────────────────────────────┐
│           React Frontend (Vite)         │
│     Chat UI + User Context Panel        │
│              Port 5173                  │
└──────────────┬──────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────┐
│        Express.js Backend (MERN)        │
│  Routes, Auth, Sessions, Chat History   │
│  MongoDB (Users, Conversations, Msgs)   │
│              Port 3000                  │
└──────────────┬──────────────────────────┘
               │ HTTP (internal)
┌──────────────▼──────────────────────────┐
│      FastAPI + AGNO (AI Pipeline)       │
│                                         │
│  Agent 1: Query Expander (Ollama)       │
│  Agent 2: Medical Reasoner (Ollama)     │
│                                         │
│  Services:                              │
│    - PubMed API fetcher                 │
│    - OpenAlex API fetcher               │
│    - ClinicalTrials.gov API fetcher     │
│    - Result ranker/filter               │
│              Port 8000                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Ollama (phi3:mini)              │
│         Local LLM on port 11434        │
└─────────────────────────────────────────┘
```

## PROJECT STRUCTURE

```
curalink/
├── client/                          # React Frontend (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css                # Tailwind CSS
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx       # Main chat area with messages
│   │   │   ├── ChatInput.tsx        # Input bar with send button
│   │   │   ├── MessageBubble.tsx    # Single message (user or assistant)
│   │   │   ├── ResearchCard.tsx     # Publication card with title, authors, year, URL
│   │   │   ├── TrialCard.tsx        # Clinical trial card with status, location, contact
│   │   │   ├── ContextPanel.tsx     # Sidebar showing user context (name, disease, location)
│   │   │   ├── ConversationList.tsx # List of past conversations
│   │   │   ├── Header.tsx
│   │   │   ├── LoadingIndicator.tsx # Animated loading while AI processes
│   │   │   └── StructuredResponse.tsx # Renders structured AI response sections
│   │   ├── hooks/
│   │   │   ├── useChat.ts           # Chat state management
│   │   │   └── useConversations.ts  # Conversation list management
│   │   ├── lib/
│   │   │   └── api.ts              # Axios instance
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                          # Express.js Backend
│   ├── src/
│   │   ├── index.ts                 # Entry point
│   │   ├── app.ts                   # Express app setup
│   │   ├── config/
│   │   │   ├── db.ts               # MongoDB connection
│   │   │   └── env.ts              # Env validation
│   │   ├── models/
│   │   │   ├── User.ts             # User schema
│   │   │   ├── Conversation.ts     # Conversation schema
│   │   │   └── Message.ts          # Message schema (stores sources)
│   │   ├── routes/
│   │   │   ├── chat.routes.ts      # POST /chat, GET /conversations
│   │   │   └── user.routes.ts      # POST /user (create/update context)
│   │   ├── services/
│   │   │   └── ai.service.ts       # Calls FastAPI AI pipeline
│   │   ├── middleware/
│   │   │   └── error.middleware.ts
│   │   └── utils/
│   │       ├── ApiError.ts
│   │       └── ApiResponse.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── ai/                              # FastAPI + AGNO Backend
│   ├── main.py                      # FastAPI app entry
│   ├── config.py                    # Settings
│   ├── agents/
│   │   ├── query_agent.py           # AGNO Agent: Query Expander
│   │   └── reasoning_agent.py       # AGNO Agent: Medical Reasoner
│   ├── services/
│   │   ├── pubmed.py               # PubMed API fetcher
│   │   ├── openalex.py             # OpenAlex API fetcher
│   │   ├── clinical_trials.py      # ClinicalTrials.gov API fetcher
│   │   └── ranker.py               # Ranking + filtering logic
│   ├── schemas/
│   │   ├── request.py              # Pydantic request models
│   │   └── response.py             # Pydantic response models
│   ├── requirements.txt
│   └── .env.example
│
├── docker-compose.yml               # Optional: for easy local setup
└── README.md                        # COMPREHENSIVE setup + architecture doc
```

## MONGODB SCHEMAS

### User

```javascript
{
  name: String,                    // optional
  diseaseOfInterest: String,       // e.g., "Parkinson's disease"
  location: String,                // e.g., "Toronto, Canada"
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation

```javascript
{
  userId: ObjectId (ref: User),
  title: String,                   // Auto-generated from first message
  context: {                       // Tracks accumulated context
    disease: String,
    location: String,
    topics: [String]               // Running list of discussed topics
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Message

```javascript
{
  conversationId: ObjectId (ref: Conversation),
  role: String,                    // 'user' | 'assistant'
  content: String,                 // The text message
  structured: {                    // Only for assistant messages
    overview: String,              // Condition overview paragraph
    insights: String,              // Research insights paragraph
    trialSummary: String           // Clinical trials summary paragraph
  },
  publications: [{                 // Research papers cited
    title: String,
    authors: [String],
    year: Number,
    source: String,                // 'PubMed' | 'OpenAlex'
    url: String,
    abstract: String,
    relevanceScore: Number
  }],
  clinicalTrials: [{               // Clinical trials cited
    title: String,
    status: String,                // 'Recruiting', 'Completed', etc.
    eligibility: String,
    location: String,
    contact: String,
    url: String
  }],
  createdAt: Date
}
```

## EXPRESS API ENDPOINTS

```
POST   /api/users                  — Create/update user context (name, disease, location)
GET    /api/users/:id              — Get user context

POST   /api/chat                   — Send message, get AI response
       Body: { userId, conversationId?, message, disease?, location? }
       Returns: { message (assistant response), conversationId }

GET    /api/conversations/:userId  — List user's conversations
GET    /api/conversations/:id/messages — Get messages in a conversation
DELETE /api/conversations/:id      — Delete a conversation
```

### POST /api/chat — The Main Flow

```
1. Receive user message
2. Find or create conversation
3. Save user message to MongoDB
4. Get conversation history (last 5 messages for context)
5. Call FastAPI AI pipeline: POST http://localhost:8000/api/research
   Body: { query, disease, location, conversationHistory }
6. Receive structured AI response
7. Save assistant message to MongoDB (with publications + trials)
8. Update conversation context (disease, topics)
9. Return response to frontend
```

## FASTAPI + AGNO ENDPOINTS

```
POST   /api/research               — Main AI pipeline
       Body: { query, disease, location, conversationHistory }
       Returns: structured response with publications + trials

GET    /api/health                  — Health check
```

### POST /api/research — The AI Pipeline

```python
# Step 1: Query Expansion (AGNO Agent #1)
# Input: user query + disease + conversation history
# Output: list of 3-5 expanded search terms

# Step 2: Parallel API Fetching (NOT the LLM — pure Python code)
# Fetch from PubMed, OpenAlex, ClinicalTrials.gov simultaneously
# Use asyncio.gather() for parallel execution

# Step 3: Ranking + Filtering (NOT the LLM — pure Python code)
# Deduplicate by title similarity
# Score by: relevance + recency + citation count
# Keep top 8 publications + top 5 clinical trials

# Step 4: Medical Reasoning (AGNO Agent #2)
# Input: user query + disease + user location + top results
# Output: structured response with overview, insights, trial summary, source attribution
```

## AGNO AGENT DEFINITIONS

### Agent 1: Query Expander

```python
from agno.agent import Agent
from agno.models.ollama import Ollama

query_agent = Agent(
    name="Query Expander",
    model=Ollama(id="phi3:mini"),
    description="You are a medical research query expansion specialist.",
    instructions=[
        "Given a disease name and user query, generate 3-5 expanded search terms.",
        "Each search term should combine the disease with relevant medical concepts.",
        "Include both specific treatments and broader research areas.",
        "Output ONLY a JSON array of search strings, nothing else.",
        "Example input: disease='Parkinson's disease', query='Deep Brain Stimulation'",
        "Example output: [\"deep brain stimulation Parkinson's disease\", \"DBS treatment Parkinson's\", \"neurostimulation movement disorders\", \"Parkinson's disease surgical treatment 2024\"]"
    ],
    markdown=False,
    add_history_to_context=True,
    num_history_runs=3,
)
```

### Agent 2: Medical Reasoner

```python
reasoning_agent = Agent(
    name="Medical Reasoner",
    model=Ollama(id="phi3:mini"),
    description="You are a medical research analyst that synthesizes research papers and clinical trials into structured, patient-friendly responses.",
    instructions=[
        "You will receive: a user's query, their disease of interest, their location, and a set of research publications and clinical trials.",
        "Your job is to synthesize this information into a helpful, structured response.",
        "ALWAYS cite specific papers by title and authors when making claims.",
        "NEVER hallucinate — only reference papers and trials provided to you.",
        "Structure your response as JSON with these exact keys:",
        "  overview: A 2-3 sentence overview of the condition and the user's specific query",
        "  insights: A detailed paragraph synthesizing key findings from the research papers, citing specific studies",
        "  trialSummary: A paragraph about relevant clinical trials, including locations and status",
        "If location is provided, prioritize trials near that location.",
        "Be empathetic but factual. This is medical information — accuracy matters."
    ],
    markdown=False,
    add_history_to_context=True,
    num_history_runs=5,
)
```

## API INTEGRATION DETAILS

### PubMed API

```python
# Step 1: Search for IDs
PUBMED_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
params = {
    "db": "pubmed",
    "term": search_query,        # e.g., "lung cancer treatment"
    "retmax": 50,                # fetch 50 IDs
    "sort": "pub+date",          # newest first
    "retmode": "json"
}

# Step 2: Fetch details for those IDs
PUBMED_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
params = {
    "db": "pubmed",
    "id": "id1,id2,id3,...",     # comma-separated IDs from step 1
    "retmode": "xml"             # returns XML with full article data
}
# Parse XML to extract: title, abstract, authors, year, journal
# Construct URL: https://pubmed.ncbi.nlm.nih.gov/{id}/
```

### OpenAlex API

```python
OPENALEX_URL = "https://api.openalex.org/works"
params = {
    "search": search_query,
    "per-page": 50,
    "page": 1,
    "sort": "relevance_score:desc",
    "filter": "from_publication_date:2020-01-01"  # last 5 years
}
# Response is JSON — extract from results[]:
#   title, authorships[].author.display_name, publication_year,
#   primary_location.source.display_name, doi, cited_by_count
# Construct URL from DOI: https://doi.org/{doi}
```

### ClinicalTrials.gov API

```python
CLINICALTRIALS_URL = "https://clinicaltrials.gov/api/v2/studies"
params = {
    "query.cond": disease,           # e.g., "lung cancer"
    "query.term": search_query,      # additional search terms
    "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED",
    "filter.geo": f"distance({lat},{lng},100mi)",  # if location provided
    "pageSize": 30,
    "format": "json"
}
# Extract from protocolSection:
#   identificationModule.briefTitle
#   statusModule.overallStatus
#   eligibilityModule.eligibilityCriteria
#   contactsLocationsModule.locations[].city, .state, .country
#   contactsLocationsModule.centralContacts[].name, .phone, .email
# Construct URL: https://clinicaltrials.gov/study/{nctId}
```

## RANKING/FILTERING LOGIC

```python
# This is CODE, not LLM — deterministic and fast

def rank_publications(publications: list, query: str, disease: str) -> list:
    """
    Score each publication and return top 8.

    Scoring factors (0-100 scale):
    1. Title relevance (0-40): How many query terms appear in title
    2. Recency (0-30): Score based on publication year
       - 2025-2026: 30pts, 2023-2024: 25pts, 2021-2022: 20pts, older: 10pts
    3. Citation count (0-20): Normalized citation count
       - Top 10% by citations: 20pts, top 25%: 15pts, rest: 5pts
    4. Has abstract (0-10): Papers with abstracts score higher
    """

def rank_trials(trials: list, query: str, location: str) -> list:
    """
    Score each trial and return top 5.

    Scoring factors (0-100 scale):
    1. Status (0-30): Recruiting > Active > Completed
    2. Location match (0-40): Near user's location scores highest
    3. Relevance (0-30): Query terms in title/conditions
    """

def deduplicate(publications: list) -> list:
    """
    Remove duplicate papers (same title appearing in both PubMed and OpenAlex).
    Use case-insensitive title comparison.
    Keep the version with more metadata (abstract, citation count).
    """
```

## REACT FRONTEND

### Chat Interface Layout

```
┌──────────────────────────────────────────────┐
│  HEADER: CuraLink — AI Medical Research      │
├────────────┬─────────────────────────────────┤
│            │                                 │
│  SIDEBAR   │       CHAT AREA                │
│            │                                 │
│ Convo 1    │  [User bubble]                 │
│ Convo 2    │  "Latest treatment for         │
│ Convo 3    │   lung cancer in Toronto"      │
│            │                                 │
│ ────────── │  [Assistant bubble]             │
│            │   Overview: ...                │
│ Context:   │   Research Insights: ...       │
│ Disease:   │   [Publication Card 1]         │
│  Lung Ca.  │   [Publication Card 2]         │
│ Location:  │   [Trial Card 1]              │
│  Toronto   │   [Trial Card 2]              │
│            │                                 │
├────────────┴─────────────────────────────────┤
│  [Type your question...          ] [Send]    │
└──────────────────────────────────────────────┘
```

### Key UI Components

**ChatInput.tsx:**

- Text input with send button
- On first message of conversation, also capture disease + location
- Show loading indicator while AI processes (this takes 15-30 sec with local LLM)

**StructuredResponse.tsx:**

- Renders the AI response in sections: Overview → Research Insights → Clinical Trials
- Each section is visually distinct with headers

**ResearchCard.tsx:**

- Compact card showing: title, authors (first 3), year, source badge (PubMed/OpenAlex), link
- Hover to show abstract snippet

**TrialCard.tsx:**

- Card showing: title, status badge (Recruiting=green, Completed=gray), location, contact info, link

**LoadingIndicator.tsx:**

- Important because LLM processing takes 15-30 seconds
- Show animated dots or progress steps: "Expanding query..." → "Fetching research..." → "Analyzing results..." → "Generating response..."
- This makes the wait feel intentional, not broken

### Design

- Clean, medical-professional look
- White/light gray background, blue accent color
- Tailwind CSS for styling
- Mobile responsive (evaluators might test on phone)
- NO fancy animations — clean and functional

## CONTEXT HANDLING (Multi-turn Conversations)

```
Message 1: "Latest treatment for lung cancer"
→ Conversation.context = { disease: "lung cancer", topics: ["treatment"] }

Message 2: "Can I take Vitamin D?"
→ System sees no disease mentioned in new message
→ Pulls disease from conversation.context: "lung cancer"
→ Sends to AI pipeline: { query: "Vitamin D", disease: "lung cancer", history: [...] }
→ AI responds with lung-cancer-specific Vitamin D research
→ Conversation.context.topics = ["treatment", "Vitamin D"]
```

The Express backend handles this by:

1. Checking if user message contains a disease reference
2. If not, pulling from conversation.context.disease
3. Always sending last 5 messages as conversationHistory to AI pipeline
4. AGNO agents have add_history_to_context=True for LLM-level context

## RESPONSE TIME EXPECTATIONS

On your machine (16GB RAM, CPU, phi3:mini):

- Query expansion: 3-5 sec
- API fetching (parallel): 2-4 sec
- Ranking/filtering: <1 sec
- LLM reasoning: 8-15 sec
- TOTAL: ~15-25 sec per query

This is FINE for a prototype. Add the step-by-step loading indicator so evaluators see progress.

## DEPLOYMENT PLAN

### Frontend: Vercel (free)

```bash
cd client && npm run build
# Deploy to Vercel
```

### Express Backend: Render or Railway (free tier)

```bash
# Set MONGODB_URI, AI_SERVICE_URL env vars
```

### FastAPI + AGNO: Render or Railway (free tier)

```bash
# Set OLLAMA_HOST env var
```

### Ollama/LLM: The tricky part

For the DEPLOYED version, since you can't run Ollama on free hosting:

- Use Hugging Face Inference API as the model provider
- This runs OPEN-SOURCE models (phi3, mistral, llama) — NOT OpenAI/Gemini
- AGNO supports HuggingFace models: `from agno.models.huggingface import HuggingFace`
- In your Loom video, show LOCAL Ollama running (proves you built custom LLM pipeline)
- In deployment, use HuggingFace endpoint (proves it works live)
- MENTION this tradeoff in your Loom video — shows engineering maturity

### Alternative: Use Groq (free tier)

- Groq runs open-source models (Llama 3, Mixtral) — NOT OpenAI/Gemini
- Much faster than HuggingFace Inference API
- AGNO has Groq support: `from agno.models.groq import Groq`
- Free tier: 30 requests/minute — plenty for demo

## README.md MUST INCLUDE

1. **Project Overview** — What CuraLink does, who it's for
2. **Architecture Diagram** — The 4-layer diagram above (ASCII or image)
3. **Tech Stack** — Why each technology was chosen
4. **AI Pipeline** — Detailed explanation of the 4-step pipeline
5. **AGNO Framework** — Why you chose it (mention your contribution)
6. **Setup Instructions** — Step by step for local development
7. **Environment Variables** — All required env vars
8. **API Documentation** — All endpoints
9. **Ranking Algorithm** — How publications and trials are scored
10. **Context Handling** — How multi-turn conversations work
11. **Deployment** — How the app is deployed
12. **Trade-offs & Decisions** — Why real-time vs stored, why phi3:mini, etc.
13. **Future Improvements** — What you'd add with more time:
    - Vector DB for cached research (RAG)
    - Fine-tuned medical LLM
    - User health profile persistence
    - Alerts for new research in user's disease area
    - PDF report generation

## BUILD ORDER

### Day 1: Foundation

1. Initialize project structure (3 directories: client, server, ai)
2. Set up Express.js with TypeScript, MongoDB connection, env config
3. Create MongoDB models (User, Conversation, Message)
4. Create Express routes (chat, users, conversations) — placeholder responses
5. Set up React with Vite + TypeScript + Tailwind CSS
6. Build basic chat UI: ChatWindow, ChatInput, MessageBubble
7. Connect React to Express — test sending/receiving messages
8. Test: Can send a message and see it stored in MongoDB

### Day 2: AI Pipeline

9. Set up FastAPI project with AGNO
10. Configure AGNO agents (Query Expander + Medical Reasoner) with Ollama
11. Build PubMed API fetcher service — test with sample query
12. Build OpenAlex API fetcher service — test with sample query
13. Build ClinicalTrials.gov API fetcher service — test with sample query
14. Build ranking/filtering logic
15. Wire up the full pipeline: query expansion → fetch → rank → reason
16. Connect Express to FastAPI — test end-to-end

### Day 3: Polish + Context

17. Build StructuredResponse component (renders overview, insights, trials)
18. Build ResearchCard and TrialCard components
19. Add step-by-step loading indicator
20. Implement conversation context handling (pull disease from history)
21. Build ContextPanel sidebar showing current disease/location
22. Build ConversationList sidebar
23. Add conversation history to AGNO agent context
24. Test multi-turn conversations with follow-up questions

### Day 4: Deploy + Demo

25. Test all 4 example use cases from the assignment
26. Fix any bugs from testing
27. Set up Groq/HuggingFace as deployment LLM provider
28. Deploy frontend to Vercel
29. Deploy Express to Render/Railway
30. Deploy FastAPI to Render/Railway
31. Test deployed version end-to-end
32. Record Loom video:
    - 30 sec: Introduce yourself + mention ArcForge (builder credibility)
    - 30 sec: Architecture overview (4-layer diagram)
    - 30 sec: AI pipeline explanation (query expand → fetch → rank → reason)
    - 15 sec: Mention AGNO + your open-source contribution
    - 3 min: Live demo with all 4 use cases + follow-up question
    - 30 sec: Trade-offs, what you'd improve with more time
33. Submit on Telegram group

## LOOM VIDEO SCRIPT (5-6 minutes)

"Hey, I'm Swayam. I built CuraLink as a full-stack AI medical research assistant.

Quick background — I recently launched ArcForge, my own product. Before that, I spent 7 months at SkillRank, a NYC startup, building CivicSight AI — an LLM-powered document processing platform. The architecture I used there directly influenced how I built CuraLink.

[Show architecture diagram]
The system has 4 layers. React frontend for the chat interface. Express.js backend handling sessions, chat history, and MongoDB storage. A FastAPI service running the AI pipeline using AGNO — which is a framework I actually contributed to. I built a Neo4j toolkit that got merged into their official repo. And Ollama running phi3:mini locally for the LLM.

[Show pipeline]
When a user asks a question, here's what happens:

1. AGNO Agent #1 expands the query intelligently
2. My code fetches from PubMed, OpenAlex, and ClinicalTrials.gov in parallel
3. A ranking algorithm scores by relevance, recency, and citations — filters down to top results
4. AGNO Agent #2 synthesizes everything into a structured, source-backed response

The key design decision: the LLM only does what it's good at — understanding queries and reasoning over text. The fetching and ranking is deterministic code. This is how production AI systems work.

[Live demo with 4 use cases]
Let me show you...

[Follow-up question demo — showing context awareness]

[Trade-offs]
For deployment, I use Groq running open-source models since Ollama can't run on free hosting. Locally it runs on phi3:mini through Ollama. With more time, I'd add a vector database for cached research, a fine-tuned medical LLM, and user health profile persistence.

Thanks for watching!"

## WHAT MAKES THIS SUBMISSION WIN

1. **AGNO framework** — you contributed to it. Nobody else will have this.
2. **CivicSight connection** — you've built this EXACT type of system before in production.
3. **Clean architecture** — 4 layers, clear separation, each doing one thing well.
4. **Smart pipeline** — LLM does reasoning, CODE does fetching and ranking. Not "dump everything into GPT."
5. **Real ranking algorithm** — not just "top 3 from API." You fetch 100+, score them, and show top 8.
6. **Context handling** — follow-up questions actually work with disease context.
7. **ArcForge mention** — you're a builder who ships products, not just a hackathon participant.
8. **Step-by-step loading** — shows the user what's happening during the 15-25 sec processing time.

## IMPORTANT NOTES

- DO NOT over-engineer. Clean and functional beats complex and broken.
- Test with ALL 4 example queries before submitting.
- The Loom video is your PRIMARY evaluation tool — make it clear and confident.
- DO NOT show code in the Loom video — show the LIVE APP and explain the ARCHITECTURE.
- Make sure the deployed link actually works. Test it from a different browser/device.
- If something doesn't work perfectly, EXPLAIN the trade-off in your video. Honesty + understanding > pretending.

START BUILDING. Follow the build order step by step. Ask me before making major architectural decisions.
