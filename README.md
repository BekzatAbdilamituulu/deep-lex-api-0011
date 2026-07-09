# DeepLex

DeepLex is a calm vocabulary memory companion for serious readers.

Save a word from your reading. Add the sentence if you want to remember the moment. Review words collected from your reading with spaced repetition.

No streaks. No noise. Just deep vocabulary memory.

Live site:
- `https://deeplex.onrender.com`

## Product Direction

DeepLex is not organized around documents, page lists, or collection filters. The core loop is intentionally small:

1. Capture a word while reading.
2. Add the translation or meaning.
3. Optionally add the sentence that made the word worth saving.
4. Review collected words daily with SRS.

The optional context sentence is kept because it helps memory without turning the product into a document manager.

## Repository Structure

- `backend/`: FastAPI API, PostgreSQL, Alembic migrations, pytest suite
- `frontend/`: React + Vite client

## Current Features

### Backend

- JWT auth with refresh tokens
- Google sign-in via verified Google ID token
- User profile and learning-pair management
- Language management
- Deck and card CRUD
- Inbox quick add and bulk import
- Auto preview for translation/example suggestions
- SRS study flow
- Progress summary and daily review data
- Curated vocabulary collections for optional import
- Health endpoint

### Frontend

- Auth, registration, and onboarding
- Learning-pair selection
- Dashboard quick add for saving words from reading
- Optional context sentence entry
- Word list with memory strength
- Study page for daily SRS review
- Progress views for review history and memory state
- Curated vocabulary collection browser

## Tech Stack

### Backend

- Python 3.11
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic v2
- python-jose + passlib/bcrypt
- httpx
- pytest

### Frontend

- React 19
- React Router
- Vite
- Tailwind CSS v4
- Axios
- Recharts

## API Base Path

All API routes are under:

`/api/v1`

## Key API Routes

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/login-json`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Users & Learning Pairs

- `GET /api/v1/users/me`
- `PUT /api/v1/users/me/languages`
- `GET /api/v1/users/me/learning-pairs`
- `POST /api/v1/users/me/learning-pairs`
- `PUT /api/v1/users/me/learning-pairs/{pair_id}/default`
- `GET /api/v1/users/me/default-learning-pair`
- `PUT /api/v1/users/me/goals`

### Languages

- `GET /api/v1/languages`
- `POST /api/v1/admin/languages` (admin)
- `PATCH /api/v1/admin/languages/{language_id}` (admin)
- `DELETE /api/v1/admin/languages/{language_id}` (admin)

### Decks & Cards

- `GET /api/v1/decks`
- `POST /api/v1/decks`
- `GET /api/v1/decks/{deck_id}`
- `PATCH /api/v1/decks/{deck_id}`
- `DELETE /api/v1/decks/{deck_id}`
- `GET /api/v1/decks/{deck_id}/cards`
- `POST /api/v1/decks/{deck_id}/cards`
- `PATCH /api/v1/decks/{deck_id}/cards/{card_id}`
- `POST /api/v1/decks/{deck_id}/cards/{card_id}/reset`
- `DELETE /api/v1/decks/{deck_id}/cards/{card_id}`

### Study & Progress

- `GET /api/v1/study/decks/{deck_id}/next`
- `GET /api/v1/study/decks/{deck_id}/status`
- `POST /api/v1/study/{card_id}`
- `GET /api/v1/progress/summary`
- `GET /api/v1/progress/daily`
- `GET /api/v1/progress/month`
- `GET /api/v1/progress/today-added`
- `DELETE /api/v1/progress/me/progress`

### Inbox / Auto / Library

- `POST /api/v1/inbox/word`
- `POST /api/v1/inbox/bulk`
- `POST /api/v1/auto/preview`
- `GET /api/v1/library/decks`
- `GET /api/v1/library/decks/{deck_id}/cards`
- `POST /api/v1/library/cards/{card_id}/import`
- `POST /api/v1/library/decks/{deck_id}/import-selected`
- `POST /api/v1/library/admin/decks` (admin)

### Health

- `GET /api/v1/health`

## Run Locally

### Backend

```bash
docker compose up -d postgres
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Default local backend database:
- `postgresql://postgres:postgres@localhost:5432/deeplex`

The bundled Docker Compose setup also creates:
- `deeplex_test` for the backend test suite

Required backend auth env:
- `GOOGLE_CLIENT_ID` for Google sign-in

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Typical frontend URL:
- `http://127.0.0.1:5173`

Required frontend auth env:
- `VITE_GOOGLE_CLIENT_ID` must match the Google web client configured for the frontend origin

## Tests

Run backend tests:

```bash
docker compose up -d postgres
cd backend
pytest
```

Run frontend build:

```bash
cd frontend
npm run build
```

## Deploy On Render

This repo is set up for a split Render deployment:

- backend: Render web service from `backend/`
- frontend: Render static site from `frontend/`
- database: PostgreSQL connected through `DATABASE_URL`

Current deployed frontend:
- `https://deeplex.onrender.com`

The repo root includes a [`render.yaml`](/home/bekzat/Desktop/cortex/render.yaml) blueprint for the backend and frontend services. Secrets and environment-specific values should be configured in Render.
