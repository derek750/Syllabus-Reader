/**
 * API base URL for backend (e.g. "https://your-backend.fly.dev/api").
 * In production, set VITE_API_URL in your environment (e.g. Vercel project
 * settings) to your deployed backend URL including /api.
 */
export const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
