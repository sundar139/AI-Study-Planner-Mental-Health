# AssignWell

An AI‑powered, mental‑health‑aware academic planner. AssignWell helps students plan study sessions, manage assignments and goals, track wellbeing, and get personalized insights and micro‑interventions. It consists of a Next.js frontend and a FastAPI backend.

## Overview

- Plan study sessions and track progress across assignments and goals.
- Log mood and wellbeing, then get AI insights and personalized suggestions.
- Use a built‑in assistant and chat to ask questions and take action.
- Keep a unified dashboard: calendar, schedule view, upcoming tasks, insights.

## Main Features

- Authentication with protected routes and cookie/token persistence.
- Dashboard combining calendar, schedule blocks, insights, and upcoming tasks.
- Assignments management: create tasks, subtasks, plan sessions, import documents.
- Goals with suggested multi‑day session timings and quick scheduling to calendar.
- Wellbeing tracking: mood checkins, fatigue‑aware planning and micro‑interventions.
- AI assistant for insights and chat, with fast model routing and fallbacks.
- Peer support (groups, messages) and activity logging.

## Technical Details

- Frontend
  - Framework: `Next.js 16`, `React 19`
  - Styling: Tailwind CSS (`tailwind.config.ts`)
  - State: `zustand` with persistence; cookie mirroring for server middleware
  - API client: `axios` with retry on timeouts and localhost fallback
  - Routing: Next App Router with `middleware.ts` guarding protected pages
  - Linting: ESLint Core Web Vitals (`eslint.config.mjs`)
  - Tests: Playwright E2E (`npm run test:e2e`)

- Backend
  - Framework: FastAPI with modular routers under `api_v1`
  - Data: SQLAlchemy ORM, Alembic migrations
  - Schemas: Pydantic models
  - Auth: JWT via `python-jose` and password hashing via `passlib`
  - Services: AI integrations with OpenAI SDK (optional; enable via environment variables)
  - CORS configured for local frontend

- Key Paths
  - `frontend/src/app`: pages and layouts
  - `frontend/src/components`: UI and dashboard components
  - `frontend/src/lib/api.ts`: axios setup, interceptors, retry/fallback
  - `frontend/src/store/auth.ts`: zustand store and cookie persistence
  - `frontend/middleware.ts`: auth guard and redirect
  - `backend/app/api/api_v1`: routers (auth, users, assignments, mood, goals, etc.)
  - `backend/app/models`: SQLAlchemy models
  - `backend/app/crud`: data access layer
  - `backend/app/schemas`: Pydantic schemas

## Installation & Setup

### Prerequisites

- Node.js 18+ (recommended 20+)
- Python 3.10+
- PostgreSQL 14+ (local or remote)
- Optional: Redis (if you enable Celery background tasks)

### Clone the Repository

```
git clone <your-repo-url>
cd <project-directory>
```

### Backend Setup (Windows)

1. Create and activate a virtual environment:
   - `python -m venv venv`
   - `venv\Scripts\activate`
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Configure environment variables by creating a `.env` file in the project root with one of the following:
   - Use a single URL:
     - `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>`
   - Or define discrete Postgres settings:
     - `POSTGRES_SERVER=localhost`
     - `POSTGRES_USER=postgres`
     - `POSTGRES_PASSWORD=<secure-password>`
     - `POSTGRES_DB=assignwell`
     - `POSTGRES_PORT=5432`
   - Required auth settings:
     - `SECRET_KEY=<generate-a-strong-secret>`
   - Optional AI settings:
     - `OPENAI_API_KEY=<your-key>`
     - `OPENAI_MODEL=gpt-4o-mini`
     - `OPENAI_FAST_MODEL=gpt-3.5-turbo`
4. Initialize the database (Postgres must be running):
   - `cd backend`
   - `alembic upgrade head`

### Frontend Setup

1. Install dependencies:
   - `cd frontend`
   - `npm install`
2. Create `.env.local` in `frontend` (optional, defaults to localhost):
   - `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1`
   - `NEXT_PUBLIC_API_TIMEOUT_MS=20000`

### Start the Apps

Use these Windows commands in two terminals:

1. Run backend in terminal:
   - `cd backend`
   - `venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
2. Run frontend in a different terminal:
   - `cd frontend`
   - `npm run dev`

The frontend will be available at `http://127.0.0.1:3000/` and will call the backend at `http://127.0.0.1:8000/api/v1`.

## Usage Examples

- Health check (backend):
  - `curl http://127.0.0.1:8000/health`
- Login (frontend):
  - Visit `/login`, enter credentials, and the app will set an `assignwell_token` cookie used by middleware.
- Dashboard:
  - See calendar, schedule blocks, upcoming tasks, and insights on `/`.
- Assignments:
  - Create an assignment, add subtasks, and auto‑plan sessions; import docs where applicable.
- Goals:
  - Open `/goals`, pick suggested session times, and schedule them to the calendar.
- Wellbeing:
  - Log mood checkins on `/wellbeing` and view AI insights and suggestions.

## Additional Requirements & Dependencies

- Backend packages: FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic, `python-jose`, `passlib`, `python-multipart`, `psycopg2-binary`, `python-dotenv`, `email-validator`, optional `celery` and `redis`, optional `openai`.
- Frontend packages: Next.js, React, Tailwind CSS, `axios`, `zustand`, radix UI primitives, and Playwright for E2E.
- Ensure PostgreSQL is available and environment variables are configured before starting the backend.

## Development Notes

- Middleware enforces auth by redirecting unauthenticated users to `/login` while allowing public/static paths.
- Axios client attaches token from cookie/Zustand and retries on timeouts with a longer window; it also falls back between localhost variants on network errors.
- Do not commit secrets or local databases; keep them in `.env` and local state.

### Security & Hygiene

- Never commit `.env` or secrets to source control. Use `.env.example` with placeholders.
- Ensure `.gitignore` excludes `backend/.env`, `backend/assignwell.db`, `frontend/.next`, `node_modules`, and caches.
- Configure database URLs via environment variables; avoid hard-coded credentials in configs.