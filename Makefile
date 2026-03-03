.PHONY: up down build logs backend streamlit react db shell-db

# ── Docker ─────────────────────────────────────────────────────────────────────

up:
	docker-compose up --build

up-detached:
	docker-compose up --build -d

down:
	docker-compose down

down-volumes:
	docker-compose down -v

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

# ── Individual services ────────────────────────────────────────────────────────

db:
	docker-compose up db -d

backend:
	docker-compose up db backend -d

streamlit:
	docker-compose up db backend streamlit -d

react:
	docker-compose up db backend react -d

# ── Local dev (no Docker) ──────────────────────────────────────────────────────

install-backend:
	cd backend && pip install -r requirements.txt

run-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

install-streamlit:
	cd frontend-streamlit && pip install -r requirements.txt

run-streamlit:
	cd frontend-streamlit && streamlit run app.py

install-react:
	cd frontend-react && npm install

run-react:
	cd frontend-react && npm run dev

# ── Database ───────────────────────────────────────────────────────────────────

shell-db:
	docker exec -it finrag_db psql -U postgres -d financial_rag

# ── Cleanup ────────────────────────────────────────────────────────────────────

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
	find . -name "*.pyc" -delete 2>/dev/null; \
	find ./frontend-react -name node_modules -exec rm -rf {} + 2>/dev/null; \
	echo "Cleaned."
