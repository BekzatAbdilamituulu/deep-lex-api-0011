# Flashcards (Backend + Frontend)

Monorepo for a language-learning flashcards app:
- `backend/`: FastAPI API + SQLite + Alembic
- `frontend/`: React + Vite client

This README is based on the current repository code and tests.

## Repository Structure

- `backend/`
  - `app/` FastAPI app, routers, services, models
  - `alembic/` migrations
  - `tests/` pytest suite
  - `docker-compose.yml` backend API container
- `frontend/`
  - `src/` React app (auth, onboarding, study, progress, library)

## Current Features

### Backend (FastAPI)

- JWT auth with refresh tokens:
  - register, JSON login, refresh rotation, logout
- User profile and learning pair management:
  - default languages
  - list/add learning pairs
  - set default pair
  - update daily goals
- Language management:
  - user read-only language list
  - admin create/update/delete languages
- Deck system:
  - deck types: `main`, `users`, `library`
  - list/create/update/delete user decks (`users` decks)
  - cards CRUD + progress reset per card
- Study flow:
  - get next batch, deck status, submit answer
  - restricted to `main` decks
  - stage-based learning progression (covered by tests)
- Progress endpoints:
  - summary, daily range, month view, streak, today-added
  - reset my progress for a deck
- Inbox:
  - quick add word
  - bulk import with dry-run and duplicate handling
  - optional auto-fill when back/example are missing
- Auto preview:
  - preview translation/example suggestions without saving cache rows
- Library marketplace:
  - list library decks/cards
  - import single or selected library cards into user main deck
  - admin create library deck
- Health endpoint

### Frontend (React + Vite)

- Auth screens (welcome/login/register) with token-based guards
- First-time onboarding guard:
  - `/onboarding` is gated by `RequireNoPairs` (only users with zero pairs)
- Add pair flow for existing users:
  - `/app/pairs/new`
  - reusable `PairForm` with duplicate/same-language validation
- App shell with active pair switcher and "Add Pair" action
- Dashboard with quick add and auto preview integration
- Deck management pages:
  - user decks (`/app/decks`, `/app/decks/:deckId`)
- Study pages:
  - `/app/study`, `/app/study/:deckId`
- Progress page with charting (`recharts`)
- Library UI:
  - `/app/library` marketplace
  - `/app/library/:deckId` detail + multi-select import to Main Deck

## Tech Stack

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- Alembic
- SQLite
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

## Key API Routes (Current)

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login-json`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Users & Pairs
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
- `GET /api/v1/progress/streak`
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

## Run with Docker (Backend)

From `backend/`:

```bash
cp .env.example .env
# edit .env if needed

docker compose up --build
```

Backend URLs:
- API: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/docs`

## Run Locally (Backend + Frontend)

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# .venv\Scripts\activate   # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Typical frontend URL:
- `http://127.0.0.1:5173`

## Tests

Run backend tests:

```bash
cd backend
pytest
```

## Notes

- Admin access is username-based via `ADMIN_USERNAMES` environment variable.
