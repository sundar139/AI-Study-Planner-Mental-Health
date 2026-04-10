# AssignWell: AI Study Planner + Mental Health Companion

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2016-black)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![State](https://img.shields.io/badge/State-Zustand-orange)
![Testing](https://img.shields.io/badge/Testing-Playwright%20%2B%20Pytest-45ba63)
![AI](https://img.shields.io/badge/AI-OpenAI%20(Optional)-8A2BE2)

An academic planning platform that unifies assignments, goals, mood-aware wellbeing workflows, and AI-assisted support in a single full-stack system.

## Executive Overview

AssignWell is built for students who need more than a to-do list. The product combines academic execution (assignments, schedule blocks, goals, deadlines) with wellbeing context (mood check-ins, stress/energy signals, intervention suggestions) so planning decisions can adapt to how the learner is actually doing.

This repository contains:

- A Next.js App Router frontend for the student experience.
- A FastAPI backend with JWT auth and modular route groups.
- SQLAlchemy + PostgreSQL persistence with Alembic migration history.
- An AI service layer that supports OpenAI-backed responses and non-AI fallbacks.

## Product Architecture

AssignWell is organized around six product surfaces:

1. Dashboard
  Combines calendar, upcoming tasks, schedule blocks, activity view, and insights into one operational screen.

2. Assignments Workspace
  Supports assignment CRUD, planning, subtask generation, and document text extraction/import workflows.

3. Goals Engine
  Lets users define recurring goals and schedule goal sessions into calendar blocks with AI-assisted time suggestions.

4. Wellbeing Center
  Captures mood + additional metrics, produces insights/suggestions, and offers a replan flow when stress/fatigue shifts.

5. AI Companion
  Chat flow designed for supportive coaching tone, with session persistence and low-latency fallback behavior.

6. Peer Support
  Group creation, membership, and message exchange for social accountability.

## Technical Architecture

### End-to-End Flow

1. Browser renders App Router pages and components.
2. Middleware checks auth cookie before protected navigation.
3. Axios client attaches Bearer token and calls FastAPI routes.
4. FastAPI routes validate payloads with Pydantic schemas.
5. CRUD/service layers execute business logic and DB operations.
6. SQLAlchemy persists domain entities to PostgreSQL.
7. AI features call OpenAI when configured, otherwise fallback to deterministic heuristics/mock outputs.

### Backend Design

- Framework: FastAPI
- Data access: SQLAlchemy ORM + CRUD modules
- Migrations: Alembic revision history
- Auth: OAuth2 password flow endpoint + JWT token issuance/validation
- Password hashing: passlib (pbkdf2_sha256)
- Schema validation: Pydantic models
- Service layer: AI service abstraction with optional OpenAI client

Primary API route groups under api/v1:

- auth
- users (+ user settings)
- assignments
- courses
- schedule
- goals
- mood
- ai
- chat
- peer-groups
- interventions
- activity

### Frontend Design

- Framework: Next.js 16 + React 19
- Routing: App Router pages for dashboard, assignments, goals, wellbeing, login/register, profile, settings, peer-support
- Auth protection: middleware guard for non-public routes
- State: Zustand persisted auth store
- API transport: Axios instance with interceptors for auth header injection, timeout retry, and localhost fallback
- UI stack: Tailwind CSS + Radix UI primitives + reusable component library
- E2E tests: Playwright

## Repository Structure

```text
.
|- backend/
|  |- app/
|  |  |- api/
|  |  |- core/
|  |  |- crud/
|  |  |- db/
|  |  |- models/
|  |  |- schemas/
|  |  \- services/
|  |- alembic/
|  |- tests/
|  |- requirements.txt
|  \- alembic.ini
|- frontend/
|  |- src/
|  |  |- app/
|  |  |- components/
|  |  |- hooks/
|  |  |- lib/
|  |  \- store/
|  |- tests/
|  |- middleware.ts
|  \- package.json
\- README.md
```

## Feature Breakdown (What + Why)

### 1) Assignment Planning

What it does:

- Creates and manages assignments/courses.
- Generates AI-assisted subtasks for assignments.
- Supports importing assignment content from txt/md/docx/pdf flows in the frontend.

Why it exists:

- Students often fail at execution, not awareness. Breaking work into concrete sub-steps reduces avoidance and improves completion likelihood.

### 2) Calendar + Scheduling

What it does:

- Stores schedule blocks with type/source/status.
- Combines assignment tasks, schedule blocks, and goal sessions on dashboard views.
- Supports quick scheduling from goals into the main calendar.

Why it exists:

- Planning must become time-boxed behavior, not static lists.

### 3) Goals and Session Suggestions

What it does:

- Creates recurring goals with session frequency and duration.
- Suggests candidate time windows via rule-based slot generation.
- Optionally ranks candidate slots with AI and provides reasoning.

Why it exists:

- Goals fail without practical scheduling under real calendar constraints.

### 4) Wellbeing Check-ins and Suggestions

What it does:

- Captures mood valence, energy, stress/anxiety, sleep, and additional metrics JSON.
- Produces mood insights and wellbeing suggestions.
- Supports a week replan flow with fatigue-aware block shaping.

Why it exists:

- Academic productivity is tightly coupled to wellbeing state; static plans break under stress.

### 5) AI Chat Companion

What it does:

- Provides supportive conversational responses with session persistence.
- Stores session/message history.
- Uses timeout-safe fallback responses when AI is slow/unavailable.

Why it exists:

- Users need immediate emotional and planning support without leaving the planning workflow.

### 6) Peer Support

What it does:

- Creates groups, joins members, and posts/reads group messages.

Why it exists:

- Accountability and social reinforcement improve consistency for long-term study routines.

## Implementation Details

### Frontend

- App Router pages are implemented in src/app for dashboard, assignments, goals, wellbeing, profile, settings, peer-support, login, and register.
- middleware.ts protects authenticated routes by checking assignwell_token cookie.
- src/store/auth.ts persists token/user via Zustand and mirrors token into cookie for middleware visibility.
- src/lib/api.ts configures Axios with:
  - Authorization header injection
  - timeout retry with extended timeout
  - localhost host fallback between 127.0.0.1 and localhost
  - selective 401 redirect behavior
- Dashboard composition includes calendar, schedule view, upcoming tasks, activity blocks, check-ins, insights, and chatbot trigger.

### Backend

- app/main.py wires FastAPI app, CORS, router inclusion, root and health endpoints.
- app/api/api_v1/api.py composes modular endpoint routers.
- app/api/deps.py provides DB session dependency and JWT-based current user resolution.
- app/crud contains generic CRUD base + domain-specific CRUD modules.
- app/models defines SQLAlchemy entities and enums for assignments, schedule blocks, mood, goals, chat, interventions, settings, and peer groups.
- app/schemas contains request/response contracts.

### Authentication and Security

- Login endpoint accepts OAuth2 form data and returns JWT access token.
- JWT creation/verification uses configured secret and algorithm.
- Password hashing and verification use passlib.
- Frontend stores token in Zustand and cookie; backend validates token on protected endpoints.

### State Management

- Global auth state is centralized in a single persisted Zustand store.
- Cookie mirroring enables route protection at middleware level, not only client runtime.

### API Communication

- Axios instance centralizes API base URL, auth headers, timeout handling, and fallback behavior.
- Client pages use this shared instance for all route calls.

### Database and Migrations

- PostgreSQL is the primary target database (configurable via DATABASE_URL or POSTGRES_* settings).
- SQLAlchemy models are organized by domain.
- Alembic revision history exists under backend/alembic/versions.
- Utility scripts exist for create/reset/connectivity support (create_db.py, scripts/reset_db.py, verify_db_connection.py, reset_alembic.py).

### AI Integration

- app/services/ai_service.py is the primary AI integration layer.
- If OPENAI_API_KEY is present and OpenAI package is available, AI calls use AsyncOpenAI.
- If unavailable, service falls back to deterministic/mock responses so the app remains usable.
- AI is used in assignment planning, mood analysis, wellbeing suggestions, chat, and slot ranking.

## Problems Faced and What Was Solved

1. AI dependency and runtime variability
  Problem:
  AI-backed features can fail from missing keys, package availability, or latency.
  Solution implemented:
  A dual-mode AI service was added (OpenAI-backed when configured, fallback heuristics/mock otherwise), plus quick timeout fallback behavior in chat.

2. Planning under calendar conflicts
  Problem:
  Suggesting realistic goal slots requires conflict checks against existing schedule blocks.
  Solution implemented:
  A rule-based candidate slot engine was implemented first, then optionally AI-ranks those candidates. Fallbacks preserve usability when ranking fails.

3. Authentication consistency across client and middleware
  Problem:
  Client-only token state is insufficient for server-side route guards.
  Solution implemented:
  Auth token is persisted in Zustand and mirrored into cookie so middleware can enforce protected routes reliably.

4. Local API instability and timeout behavior
  Problem:
  Dev environments often switch between localhost and 127.0.0.1 and can hit intermittent network/timeout issues.
  Solution implemented:
  Axios interceptors implement timeout retry and host fallback behavior.

5. Evolving schema for wellbeing and goals
  Problem:
  Feature growth required new data models (additional mood metrics, wellbeing suggestions, goals/sessions).
  Solution implemented:
  New entities and migrations were added, plus reset/debug scripts for local schema recovery when environments drift.

## Setup and Run

### Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- Python 3.10+
- PostgreSQL 14+

### 1) Clone

```bash
git clone https://github.com/sundar139/AI-Study-Planner-Mental-Health.git
cd AI-Study-Planner-Mental-Health
```

### 2) Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Update backend/.env with your values.

Database bootstrap:

```powershell
alembic upgrade head
```

Run backend:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Optional helper scripts:

```powershell
python verify_db_connection.py
python create_demo_user.py
```

### 3) Frontend Setup

```powershell
cd frontend
npm install
```

Create frontend/.env.local:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
NEXT_PUBLIC_API_TIMEOUT_MS=20000
```

Run frontend:

```powershell
npm run dev
```

Open:

- Frontend: http://127.0.0.1:3000
- Backend health: http://127.0.0.1:8000/health
- OpenAPI: http://127.0.0.1:8000/api/v1/openapi.json

## Configuration Reference

### Backend Variables

- DATABASE_URL (optional alternative to discrete DB vars)
- POSTGRES_SERVER
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB
- POSTGRES_PORT
- SECRET_KEY
- ALGORITHM
- ACCESS_TOKEN_EXPIRE_MINUTES
- OPENAI_API_KEY (optional)
- OPENAI_MODEL
- OPENAI_FAST_MODEL
- BACKEND_CORS_ORIGINS

### Frontend Variables

- NEXT_PUBLIC_API_URL
- NEXT_PUBLIC_API_TIMEOUT_MS

## Testing and Evaluation

What is covered in this repository:

1. Playwright E2E tests (frontend/tests/e2e.spec.ts)
  - register/login flow
  - dashboard/assignments/peer-support route checks
  - peer group create flow
  - AI chat drawer interaction

2. Pytest backend tests (backend/tests/test_peer_groups.py)
  - peer group creation
  - peer group list retrieval
  - join behavior (including already-member guard)

3. Manual smoke script (backend/test_registration.py)
  - registration endpoint call via urllib

How to run:

```powershell
# backend
cd backend
pytest

# frontend (requires frontend and backend running)
cd ../frontend
npx playwright test
```

Honest scope note:

- The test suite is meaningful but narrow, and does not yet represent full regression coverage across all routes and edge cases.

## Results and Evidence (Repository-Backed)

Evidence present in tracked files:

1. Implemented API surface
  backend app router includes 12 domain route groups (auth/users/assignments/mood/ai/schedule/interventions/chat/peer-groups/courses/activity/goals).

2. Implemented frontend product surfaces
  App Router includes dedicated pages for dashboard, assignments, goals, wellbeing, peer-support, profile, settings, login, and register.

3. Domain model breadth
  SQLAlchemy models cover users, settings, assignments/subtasks/courses, schedule blocks, mood check-ins, goals/sessions, interventions/sessions, chat sessions/messages, peer groups/messages, activity sessions, and wellbeing suggestions.

4. Schema evolution trail
  Alembic revision files track iterative additions such as mood additional_metrics, wellbeing suggestions, and goal/goal_session entities.

5. Test artifacts in repo
  Playwright config + spec exist, and frontend/test-results directories are present from prior E2E runs.

6. Operations support
  DB setup and troubleshooting scripts are included (create_db, reset_db, reset_alembic, verify_db_connection, create_demo_user).

## Limitations

- No CI workflow is committed for automated test/lint enforcement.
- Several Alembic revisions are placeholders/no-op, so migration discipline still needs tightening for team-scale reliability.
- AI behavior quality depends on optional OpenAI configuration; fallback mode is intentionally simpler.
- Real-time collaboration and chat messaging are request/response based (no websocket event stream).
- Automated tests are not yet comprehensive for all backend routes and frontend interaction paths.

## Conclusion

AssignWell demonstrates a practical full-stack architecture for student productivity software that treats wellbeing as a first-class planning signal, not an afterthought. The repository shows clear modular boundaries, meaningful cross-feature integration, and strong potential for production hardening.

## Future Improvements

1. Add CI pipeline with lint/test gates for backend and frontend.
2. Expand API and E2E coverage (especially goals, mood, settings, and schedule edge cases).
3. Strengthen Alembic migration quality with fully authored upgrade/downgrade paths.
4. Add observability (structured logging, request tracing, error analytics).
5. Introduce role/permission layering and refresh-token lifecycle.
6. Add deployment IaC and environment-specific configuration templates.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.