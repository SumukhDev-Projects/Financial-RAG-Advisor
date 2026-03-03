# 🏦 FinRAG — AI Financial Advisor

> A production-grade Retrieval-Augmented Generation (RAG) system for financial advisors, powered by **Claude (Anthropic)** and **pgvector**.

Upload client documents → Index with local embeddings → Ask questions, generate portfolio summaries, draft compliance-ready emails — all grounded in real document data with a full audit trail.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 💬 **RAG Q&A** | Ask questions over client documents; Claude answers using only retrieved context |
| 📋 **Portfolio Summary** | Auto-generate structured summaries with risk assessment and key metrics |
| ✉️ **Email Drafting** | Draft professional, compliant client emails grounded in actual portfolio data |
| 📤 **Document Upload** | Drag-and-drop PDF/TXT/CSV indexing with pgvector embeddings |
| 🔒 **Audit Logging** | Every query + response + source chunks logged to Postgres for compliance |
| 🖥️ **Dual Frontend** | Streamlit (rapid prototyping) + React/Vite (production-grade) |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│               FRONTENDS                                            │
│   React/Vite (port 3000)  │  Streamlit (port 8501)                │
└──────────────────┬─────────────────────────────────────────────────┘
                   │ HTTP / REST
┌──────────────────▼─────────────────────────────────────────────────┐
│                    FastAPI Backend  (port 8000)                    │
│                                                                    │
│  POST /api/documents/upload  → Extract → Chunk → Embed → Store    │
│  POST /api/advisor/ask       → Search → Retrieve → Claude → Ans   │
│  POST /api/advisor/summarize → RAG chain → Structured summary     │
│  POST /api/advisor/draft-email → RAG chain → Professional email   │
│  GET  /api/advisor/audit-logs  → Full audit trail                 │
└───────────┬──────────────────────────────────┬─────────────────────┘
            │                                  │
┌───────────▼──────────────┐     ┌─────────────▼────────────────────┐
│  PostgreSQL + pgvector   │     │  Anthropic Claude API            │
│  • documents             │     │  Model: claude-opus-4-5          │
│  • document_chunks       │     │  • Grounded Q&A                  │
│  • audit_logs            │     │  • Portfolio summaries           │
└──────────────────────────┘     │  • Email drafting                │
                                 └──────────────────────────────────┘
Embeddings: sentence-transformers/all-MiniLM-L6-v2 (runs locally, free)
```

---

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Anthropic API key](https://console.anthropic.com)

### 1. Clone and configure
```bash
git clone https://github.com/YOUR_USERNAME/financial-rag-advisor
cd financial-rag-advisor
cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY
```

### 2. Launch everything
```bash
make up
# or: docker-compose up --build
```

### 3. Open the app

| Interface | URL |
|---|---|
| **React UI** (production frontend) | http://localhost:3000 |
| **Streamlit UI** (rapid prototype) | http://localhost:8501 |
| **FastAPI Swagger docs** | http://localhost:8000/docs |

---

## 🛠️ Local Development (no Docker)

```bash
# Start only the database
docker-compose up db -d

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Streamlit
cd ../frontend-streamlit
pip install -r requirements.txt
streamlit run app.py

# React
cd ../frontend-react
npm install
npm run dev   # http://localhost:3000
```

---

## 📁 Project Structure

```
financial-rag-advisor/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + CORS + lifespan
│   │   ├── api/
│   │   │   ├── advisor.py        # ask / summarize / draft-email / audit-logs
│   │   │   ├── documents.py      # upload / list / delete
│   │   │   └── health.py
│   │   ├── rag/
│   │   │   └── chain.py          # Claude prompts for all 3 use cases
│   │   ├── models/
│   │   │   ├── db_models.py      # Document, DocumentChunk, AuditLog ORM
│   │   │   └── schemas.py        # Pydantic schemas
│   │   ├── utils/
│   │   │   ├── ingestion.py      # PDF/TXT → chunk → embed → pgvector
│   │   │   └── audit.py          # Audit log writer
│   │   └── core/
│   │       ├── config.py         # Env-driven settings
│   │       └── database.py       # Async SQLAlchemy + pgvector init
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend-react/               # Production frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AskPage.jsx       # RAG Q&A
│   │   │   ├── DocumentsPage.jsx # Upload + manage
│   │   │   ├── SummaryPage.jsx   # Portfolio summary
│   │   │   ├── EmailPage.jsx     # Email drafting
│   │   │   └── AuditPage.jsx     # Audit log viewer
│   │   ├── components/
│   │   │   ├── Layout.jsx        # Sidebar + nav + status
│   │   │   ├── SourceCard.jsx    # Source citation card
│   │   │   └── PageHeader.jsx
│   │   └── utils/api.js          # Axios API client
│   ├── Dockerfile                # Multi-stage build → nginx
│   └── nginx.conf
│
├── frontend-streamlit/           # Prototype frontend
│   ├── app.py
│   └── Dockerfile
│
├── .github/workflows/ci.yml      # GitHub Actions CI
├── docker-compose.yml            # Full stack: db + backend + streamlit + react
├── Makefile                      # make up / make logs / make shell-db etc.
├── .env.example
└── README.md
```

---

## 🔌 API Quick Reference

Full interactive docs at `http://localhost:8000/docs`

```bash
# Upload
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@portfolio.pdf" -F "client_name=John Smith" -F "doc_type=portfolio"

# Ask
curl -X POST http://localhost:8000/api/advisor/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the equity allocation?", "client_name": "John Smith"}'

# Summarize
curl -X POST http://localhost:8000/api/advisor/summarize \
  -H "Content-Type: application/json" \
  -d '{"client_name": "John Smith", "focus_areas": ["portfolio", "risk"]}'

# Draft email
curl -X POST http://localhost:8000/api/advisor/draft-email \
  -H "Content-Type: application/json" \
  -d '{"client_name": "John Smith", "email_purpose": "Q3 review", "tone": "professional"}'
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `SECRET_KEY` | ✅ | JWT signing key for production |
| `CLAUDE_MODEL` | — | Default: `claude-opus-4-5` |
| `CHUNK_SIZE` | — | Default: `800` tokens |
| `CHUNK_OVERLAP` | — | Default: `150` tokens |
| `TOP_K_RETRIEVAL` | — | Default: `5` chunks |

---

## 🔒 Security Notes

- All queries + responses + source attributions written to `audit_logs` (compliance-ready)
- `.env` excluded from git via `.gitignore` — never commit secrets
- Embeddings run **locally** via `sentence-transformers` — document content never leaves your infra
- JWT auth middleware scaffold ready in `app/core/` for production
- For production: use AWS RDS + S3 with server-side encryption

---

## 🗺️ Roadmap

- [ ] JWT authentication + advisor roles
- [ ] AWS ECS deployment with Terraform
- [ ] S3 document storage with encryption
- [ ] LangSmith tracing for RAG debugging
- [ ] Streaming responses via SSE
- [ ] Token cost tracking dashboard

---

## 🧠 Stack Rationale

| Choice | Reason |
|---|---|
| **Claude** | Best instruction following for structured financial outputs |
| **pgvector** | Vector search in same DB as structured metadata — simpler ops than Pinecone |
| **sentence-transformers** | Free, local embeddings — zero API cost for indexing |
| **FastAPI** | Async-native, automatic OpenAPI docs |
| **React + Vite** | Fast builds, modern tooling, Tailwind |
| **Streamlit** | Rapid MVP frontend for demos |

---

## 📄 License

MIT
