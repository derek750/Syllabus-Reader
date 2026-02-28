# Syllabus-Reader

## Deploying to Vercel

You can deploy both the frontend and the backend as separate Vercel projects (same repo, two projects with different Root Directories).

### Frontend

1. In [Vercel](https://vercel.com), import this repo and create a project with **Root Directory** = `frontend`.
2. Build/output are set in `frontend/vercel.json` (Vite, `dist`, SPA rewrites).
3. Add **Environment Variable**: `VITE_API_URL` = `https://your-backend-url.vercel.app/api` (use your backend deployment URL).
4. Redeploy after changing env vars.

### Backend (FastAPI): complete checklist

Do this **after** (or in parallel with) deploying the frontend so you know the frontend URL for CORS.

#### 1. Create the Vercel project

- Go to [vercel.com/new](https://vercel.com/new) and **Import** your Git repository (GitHub/GitLab/Bitbucket).
- When asked for the project name, pick one (e.g. `syllabus-reader-api`). You’ll use this in the frontend’s `VITE_API_URL` later.

#### 2. Set Root Directory

- In the import flow, expand **Configure Project**.
- Set **Root Directory** to `backend` (click **Edit**, choose the `backend` folder, confirm).
- Leave **Framework Preset** as auto-detected (Vercel will detect FastAPI from `backend/index.py`).
- Do **not** set a custom Build Command or Output Directory unless you have a reason.

#### 3. Add every environment variable

Go to **Settings → Environment Variables** and add these. Use **Production** (and optionally **Preview**) for each.

| Variable | What to put | Where to get it |
|----------|-------------|------------------|
| **SUPABASE_URL** | Your Supabase project URL | [Supabase](https://supabase.com/dashboard) → your project → **Settings → API** → **Project URL** |
| **SUPABASE_KEY** | Service role or anon key that can read/write your DB and storage | Same page → **Project API keys** → **anon** (or **service_role** if you need server-only access). Backend uses this for DB + storage. |
| **GOOGLE_CLIENT_ID** | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → create or use an OAuth 2.0 Client ID (Web application). Put the **Client ID** (ends in `.apps.googleusercontent.com`). |
| **GEMINI_API_KEY** | Gemini API key | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key. Used for the AI agent and syllabus assignment extraction. |
| **CORS_ORIGINS** | Your frontend URL(s), comma-separated, no trailing slash | After deploying the frontend: `https://your-frontend.vercel.app`. If you use a custom domain: `https://your-domain.com`. Add both if you use both (e.g. `https://app.vercel.app,https://your-domain.com`). |

Optional:

| Variable | What to put | When to set |
|----------|-------------|-------------|
| **GEMINI_MODEL_NAME** | Model ID, e.g. `gemini-1.5-flash` or `gemini-1.5-pro` | Only if you want to override the default (`gemini-1.5-flash`). |
| **REDIS_URL** | Full Redis URL | Only if you [add Redis](#adding-redis) (e.g. Upstash). Leave **unset** or empty to run without cache. |

Do **not** set `PORT`; Vercel sets that.

#### 4. Deploy

- Click **Deploy**. Vercel will install dependencies from `backend/requirements.txt` and run the FastAPI app from `backend/index.py`.
- After the build finishes, open **Deployments** → open the latest deployment → copy the **URL** (e.g. `https://syllabus-reader-api.vercel.app`).

#### 5. Wire the frontend to this backend

- In the **frontend** Vercel project: **Settings → Environment Variables**.
- Add (or update) **VITE_API_URL** = `https://your-backend-url.vercel.app/api` (use the URL from step 4 and keep `/api` at the end).
- Redeploy the frontend so the new value is baked in.

#### 6. Quick check

- Visit `https://your-backend-url.vercel.app/` → should see `{"message":"Syllabus Reader API"}`.
- Visit `https://your-backend-url.vercel.app/api/health` → should see `{"status":"ok"}`.
- Open your frontend app and sign in / load data; if CORS is correct, requests will succeed.

## Adding Redis

The backend uses Redis only for optional caching (courses/assignments). If Redis is unavailable or `REDIS_URL` is empty, the app runs without cache.

### On Vercel (hosted Redis)

Use a serverless-friendly Redis like **[Upstash](https://upstash.com)** (free tier):

1. Sign up at [console.upstash.com](https://console.upstash.com) and create a Redis database.
2. In the database dashboard, copy the **Redis URL** (e.g. `rediss://default:xxxx@us1-xxx.upstash.io:6379`).
3. In your Vercel **backend** project: **Settings → Environment Variables** → add `REDIS_URL` = that URL.
4. Redeploy the backend.

Other options (Redis Cloud, Railway Redis, etc.) work too: set `REDIS_URL` to the instance’s connection URL.

### Local / Docker

With the repo’s `docker-compose.yml`, Redis already runs in a container. Use:

- **Backend in Docker (compose):** `REDIS_URL=redis://redis:6379/0` (default in compose env).
- **Backend on host, Redis in Docker:** `REDIS_URL=redis://localhost:6379/0`.
