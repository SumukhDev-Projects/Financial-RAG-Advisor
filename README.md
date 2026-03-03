# Financial Advisor RAG — AI-Powered Document Assistant

A full-stack RAG (Retrieval-Augmented Generation) system built for financial advisors. The core idea is straightforward: upload client documents, and the system lets you ask questions, generate portfolio summaries, and draft client emails — all grounded in the actual content of those documents rather than LLM hallucinations.

Built this as a way to explore practical GenAI applications in finance, specifically around the problem of giving advisors fast, accurate access to client data without requiring them to manually dig through PDFs.

---

## What it does

**Document ingestion** — Upload PDFs, text files, or CSVs. The backend chunks them, generates embeddings using a local sentence-transformers model, and stores everything in PostgreSQL with pgvector.

**RAG Q&A** — Ask a natural language question about a client's portfolio. The system retrieves the most relevant document chunks via cosine similarity, passes them to Claude as context, and returns an answer that cites its sources. If the answer isn't in the documents, it says so.

**Portfolio summary** — Generate a structured summary covering portfolio composition, risk factors, and key metrics for a given client. Useful for quickly getting up to speed before a client meeting.

**Email drafting** — Draft professional client emails (quarterly reviews, risk alerts, onboarding messages) grounded in the client's actual data. Tone can be adjusted between professional, friendly, and formal.

**Audit logging** — Every query, response, and set of retrieved source chunks is logged to a Postgres table. This came out of thinking about compliance requirements — you need a record of what the system said and what data it used.

---

## Architecture

```
Frontends
  React/Vite (port 3000)  |  Streamlit (port 8501)
              |
              | HTTP / REST
              v
  FastAPI Backend (port 8000)
    /api/documents/upload  ->  Extract -> Chunk -> Embed -> Store
    /api/advisor/ask        ->  Retrieve -> Claude -> Answer
    /api/advisor/summarize  ->  Retrieve -> Claude -> Structured summary
    /api/advisor/draft-email ->  Retrieve -> Claude -> Email draft
    /api/advisor/audit-logs  ->  Read audit trail
              |                          |
              v                          v
  PostgreSQL + pgvector          Anthropic Claude API
  (documents, chunks,            (claude-opus-4-5)
   audit_logs)
```

Embeddings are handled locally with `sentence-transformers/all-MiniLM-L6-v2` — no external API calls during indexing, which keeps costs down and means document content stays within your infrastructure.

---

## Stack

| Component | Technology | Why |
|---|---|---|
| Backend | FastAPI (async) | Native async support, automatic OpenAPI docs |
| LLM | Claude via Anthropic SDK | Strong instruction following for structured financial outputs |
| Vector DB | PostgreSQL + pgvector | Keeps vector search in the same DB as metadata, simpler than running Pinecone separately |
| Embeddings | sentence-transformers | Runs locally, no per-request API cost |
| Document parsing | pypdf + LangChain splitters | Reliable chunking with configurable overlap |
| Frontend (prod) | React + Vite + Tailwind | Fast builds, good DX |
| Frontend (prototype) | Streamlit | Useful for quick demos and internal tooling |
| Containerization | Docker + Docker Compose | One-command setup |

---

## Getting started

### Prerequisites

- Docker Desktop running
- Anthropic API key (get one at console.anthropic.com)

### Run with Docker

```bash
git clone https://github.com/YOUR_USERNAME/financial-rag-advisor
cd financial-rag-advisor

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

make up
# or: docker-compose up --build
```

The React frontend will be at `http://localhost:3000`, Streamlit at `http://localhost:8501`, and the FastAPI docs at `http://localhost:8000/docs`.

### Local development (without Docker)

```bash
# Start the database only
docker-compose up db -d

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# React frontend
cd ../frontend-react
npm install
npm run dev

# Or Streamlit
cd ../frontend-streamlit
pip install -r requirements.txt
streamlit run app.py
```

---

## Project layout

```
financial-rag-advisor/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, DB lifespan
│   │   ├── api/
│   │   │   ├── advisor.py          # ask / summarize / draft-email / audit-logs
│   │   │   ├── documents.py        # upload / list / delete
│   │   │   └── health.py
│   │   ├── rag/
│   │   │   └── chain.py            # Claude prompts and RAG chains
│   │   ├── models/
│   │   │   ├── db_models.py        # SQLAlchemy models (Document, Chunk, AuditLog)
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── utils/
│   │   │   ├── ingestion.py        # PDF/text parsing, chunking, embedding, pgvector storage
│   │   │   └── audit.py            # Writes to audit_logs table
│   │   └── core/
│   │       ├── config.py           # Pydantic settings, env-driven
│   │       └── database.py         # Async SQLAlchemy engine, pgvector init
│   ├── requirements.txt
│   └── Dockerfile
├── frontend-react/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AskPage.jsx
│   │   │   ├── DocumentsPage.jsx
│   │   │   ├── SummaryPage.jsx
│   │   │   ├── EmailPage.jsx
│   │   │   └── AuditPage.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Sidebar, nav, backend status indicator
│   │   │   ├── SourceCard.jsx      # Displays retrieved source with relevance score
│   │   │   └── PageHeader.jsx
│   │   └── utils/api.js            # Axios client for all backend calls
│   ├── Dockerfile                  # Multi-stage: Vite build -> nginx
│   └── nginx.conf                  # SPA routing + API proxy to backend
├── frontend-streamlit/
│   ├── app.py
│   └── Dockerfile
├── .github/workflows/ci.yml        # GitHub Actions: lint, React build, compose validation
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

---

## API reference

Full Swagger UI at `http://localhost:8000/docs`. Quick curl examples:

```bash
# Upload a document
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@portfolio.pdf" \
  -F "client_name=John Smith" \
  -F "doc_type=portfolio"

# Ask a question
curl -X POST http://localhost:8000/api/advisor/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the current equity allocation?", "client_name": "John Smith"}'

# Generate portfolio summary
curl -X POST http://localhost:8000/api/advisor/summarize \
  -H "Content-Type: application/json" \
  -d '{"client_name": "John Smith", "focus_areas": ["portfolio", "risk", "performance"]}'

# Draft a client email
curl -X POST http://localhost:8000/api/advisor/draft-email \
  -H "Content-Type: application/json" \
  -d '{"client_name": "John Smith", "email_purpose": "Q3 quarterly review", "tone": "professional"}'
```

---

## Configuration

All config is environment-variable driven. Copy `.env.example` and fill in values.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | From console.anthropic.com |
| `DATABASE_URL` | Yes | localhost default | asyncpg connection string |
| `SECRET_KEY` | Yes | dev default | Change before production |
| `CLAUDE_MODEL` | No | `claude-opus-4-5` | |
| `CHUNK_SIZE` | No | `800` | Tokens per chunk |
| `CHUNK_OVERLAP` | No | `150` | Overlap between chunks |
| `TOP_K_RETRIEVAL` | No | `5` | Chunks retrieved per query |

---

## Security considerations

- `.env` is excluded from git. Never commit actual API keys.
- Embeddings run locally — document content does not leave your infrastructure during indexing.
- Every query, response, and set of source references is written to `audit_logs` with a timestamp. This is the foundation for compliance reporting.
- JWT authentication middleware is scaffolded in `app/core/` but not wired up by default. Add it before putting this in front of real client data.
- For production, replace the local Docker Postgres volume with RDS, and add S3 with server-side encryption for document storage.

---

## Makefile commands

```bash
make up              # Build and start all services
make up-detached     # Same, in background
make down            # Stop all services
make down-volumes    # Stop and delete Postgres volume
make logs            # Stream all service logs
make logs-backend    # Backend logs only
make shell-db        # Open psql session
make run-backend     # Run backend locally without Docker
make run-react       # Run React dev server locally
make clean           # Remove pycache, pyc files, node_modules
```

---

## Roadmap

- JWT authentication with advisor roles
- AWS ECS deployment with Terraform config
- S3 document storage with server-side encryption
- LangSmith integration for RAG chain tracing
- Streaming responses via Server-Sent Events
- Token usage dashboard and cost tracking per client

---

## License

MIT
