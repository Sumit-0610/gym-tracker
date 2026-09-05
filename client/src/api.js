// The one place the frontend talks to the backend.
//
// Data flow for every call:
//   component → api.something() → request() → fetch() → [Vite proxy in dev /
//   nginx in prod] → Express route → requireAuth → SQL → JSON → back here →
//   either a resolved value or a thrown ApiError → component state → re-render
//
// Design goals: consistent JSON handling, one error type, no magic.

// A single error type so callers can branch on `err.status` instead of parsing
// message strings. status 0 means "the request never got a response" (offline,
// server down, DNS, CORS) — distinct from a real HTTP error.
export class ApiError extends Error {
  constructor(status, message) {
    super(message || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Global hook so exactly one place decides what happens on a 401. AuthProvider
// registers a handler that clears the user and sends them to /login. Without
// this, every screen would have to handle "session expired" itself.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      // Only send a body (and the JSON content-type) when there is one.
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      // Send the session cookie. It's same-origin (Vite proxy / nginx), so
      // 'same-origin' is enough and slightly safer than 'include'.
      credentials: 'same-origin',
    });
  } catch {
    // fetch() only rejects on a network-level failure, never on 4xx/5xx.
    throw new ApiError(0, 'Network error — is the server running?');
  }

  // 204 No Content or an empty body: nothing to parse.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // A 401 from any call means "the session is gone" — react globally by
    // logging out. EXCEPT for GET /api/me: that endpoint's entire job is to
    // report whether we're logged in, so a 401 there is an expected answer,
    // not a session expiring. Letting it trigger the handler would redirect a
    // logged-out user away from /signup on every page load.
    if (res.status === 401 && path !== '/api/me') onUnauthorized();
    // The backend always sends { error: "..." } for failures.
    throw new ApiError(res.status, data?.error);
  }

  return data;
}

// Thin named helpers — one per endpoint the UI uses. Keeping them here means
// there is a single readable list of everything the frontend can ask for.
export const api = {
  // auth
  me: () => request('GET', '/api/me'),
  signup: (username, password) =>
    request('POST', '/api/signup', { username, password }),
  login: (username, password) =>
    request('POST', '/api/login', { username, password }),
  logout: () => request('POST', '/api/logout'),

  // exercises
  exercises: () => request('GET', '/api/exercises'),

  // routines
  routines: () => request('GET', '/api/routines'),
  routine: (id) => request('GET', `/api/routines/${id}`),
  createRoutine: (name) => request('POST', '/api/routines', { name }),
  addRoutineExercise: (routineId, payload) =>
    request('POST', `/api/routines/${routineId}/exercises`, payload),

  // workouts
  workouts: () => request('GET', '/api/workouts'),
  workout: (id) => request('GET', `/api/workouts/${id}`),
  startWorkout: (routineId) =>
    request('POST', '/api/workouts', routineId ? { routine_id: routineId } : {}),
  logSet: (workoutId, payload) =>
    request('POST', `/api/workouts/${workoutId}/sets`, payload),
};
