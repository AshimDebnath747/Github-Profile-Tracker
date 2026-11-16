const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://github-profile-tracker-geuq.onrender.com/api';

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; } }

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init.headers } }); }
  catch { throw new ApiError('Unable to reach the API. Check that the backend is running.', 0); }
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new ApiError(body.message || `Request failed (${response.status})`, response.status);
  return body as T;
}
