# Syllabus Reader

A web app to manage your courses and syllabi. Upload syllabus PDFs, extract assignments with AI, track due dates and grades, and use an AI assistant to create or edit courses and assignments—all in one place.

## Features

- **Course management** — Create courses with name, code, semester, and instructor. View them on a dashboard with grade summaries.
- **Syllabus PDFs** — Upload syllabus PDFs per course, store them in Supabase, and download when needed.
- **AI assignment extraction** — Extract assignments from a syllabus PDF using Google Gemini. Review and add them to the course with one click.
- **Assignments** — Track assignments with due dates, weights, grades, locations, and notes. Archive when done.
- **AI assistant** — Chat with a LangChain/Gemini agent that can propose creating or updating courses and assignments. Approve or reject its plan before any changes are applied.
- **Calendar** — See assignments across courses on a calendar view.
- **Sign in with Google** — Authenticate via Google; users and data are stored in Supabase.

## Tech stack

| Layer    | Tech |
| -------- | -----|
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind CSS, Recharts |
| Backend  | FastAPI, Python 3 |
| Database & storage | Supabase (PostgreSQL) |
| Auth     | Google Sign-In |
| AI       | Google Gemini, LangChain |
| Cache    | Redis |

## Project structure

```
Syllabus-Reader/
├── frontend/          # React + Vite app (port 8080)
├── backend/           # FastAPI app (port 8000)
├── docker-compose.yml # Backend + Redis
└── README.md
```

## Prerequisites

- **Node.js** (for frontend)
- **Python 3.11+** (for backend, or use Docker)
- **Supabase** project (database + storage + env vars)
- **Google Cloud** — OAuth client (for sign-in) and **Gemini API** key
- **Redis** (optional; used when running backend with Docker or if you set `REDIS_URL`)

## Setup

### 1. Supabase

- Create a project at [supabase.com](https://supabase.com).
- Run the SQL in `backend/sql/` (e.g. `users.sql`, `courses.sql`, `assignments.sql`) to create tables and storage bucket/policies as needed.
- Note your project URL and anon (or service) key for the backend.

### 2. Google Cloud

- Create a **OAuth 2.0 Client ID** (Web application) for sign-in. Add your frontend origin(s) to authorized JavaScript origins.
- Enable **Generative Language API** and create an API key for Gemini (or use the same project and ensure the key has access).

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with:
#   SUPABASE_URL, SUPABASE_KEY
#   GOOGLE_CLIENT_ID (for auth)
#   GEMINI_API_KEY (and optionally GEMINI_MODEL_NAME)
#   REDIS_URL (e.g. redis://localhost:6379/0) if using Redis
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or run with Docker (backend + Redis):

```bash
docker compose up -d --build
# Backend at http://localhost:8000
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# .env: VITE_API_URL=/api (default; dev proxy points to backend)
npm install
npm run dev
```

Frontend runs at **http://localhost:8080**. The Vite dev server proxies `/api` to `http://localhost:8000`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
| -------- | ----------- |
| `PORT` | Server port (default 8000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon or service key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for sign-in |
| `GEMINI_API_KEY` | Google Gemini API key (or `GOOGLE_API_KEY`) |
| `GEMINI_MODEL_NAME` | Optional; default `gemini-1.5-flash` |
| `REDIS_URL` | Optional; e.g. `redis://localhost:6379/0` |
| `CORS_ORIGINS` | Comma-separated allowed origins (default includes 8080, 5173) |

### Frontend (`frontend/.env`)

| Variable | Description |
| -------- | ----------- |
| `VITE_API_URL` | API base path; use `/api` when using the dev proxy |

## Scripts

**Frontend**

- `npm run dev` — Start dev server (port 8080)
- `npm run build` — Production build
- `npm run preview` — Preview production build

**Backend**

- `uvicorn app.main:app --reload --port 8000` — Dev server
- With Docker: `docker compose up -d --build`, logs: `docker compose logs -f backend`

## API overview

- **Auth** — `POST /api/auth/google` (ID token), `GET /api/auth/google-config` (client id)
- **Courses** — `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/{id}`
- **Syllabi** — `POST /api/courses/{id}/syllabus` (upload), `GET /api/courses/{id}/syllabi`, `GET/DELETE /api/syllabi/{id}`, `POST /api/syllabi/{id}/extract-assignments`
- **Assignments** — `GET/POST /api/courses/{id}/assignments`, `GET/PUT/DELETE /api/assignments/{id}`
- **Agent** — `POST /api/agent` (chat), `POST /api/agent/execute-plan`
- **Health** — `GET /api/health`

## Deployment

- **Frontend** — Static build; can be deployed to Vercel, Netlify, or any static host. `frontend/vercel.json` is set up for Vercel. Point `VITE_API_URL` to your backend API URL in the build environment.
- **Backend** — Run FastAPI on a VPS, container host, or use a serverless adapter (e.g. `index.py` for Vercel). Set `CORS_ORIGINS` to your frontend origin(s) and ensure Supabase, Google, and (if used) Redis are reachable.
