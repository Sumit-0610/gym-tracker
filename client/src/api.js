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
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // A proxy / platform error page (HTML) instead of our JSON. Surface it as
      // an ordinary ApiError rather than an opaque SyntaxError.
      throw new ApiError(res.status || 500, 'Unexpected response from server.');
    }
  }

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

// Download a file (e.g. the data export) and hand it to the browser as a save.
// Not a plain <a href>: on a 400/401 that would navigate the app to a raw JSON
// error page. Fetching first lets errors flow through ApiError like any call.
async function download(path) {
  let res;
  try {
    res = await fetch(path, { credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Network error — is the server running?');
  }
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error);
  }
  // The server names the file in Content-Disposition: attachment; filename="…"
  const match = /filename="([^"]+)"/.exec(
    res.headers.get('Content-Disposition') || '',
  );
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = match ? match[1] : 'gym-tracker-export';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the save before freeing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Thin named helpers — one per endpoint the UI uses. Keeping them here means
// there is a single readable list of everything the frontend can ask for.
export const api = {
  // auth
  me: () => request('GET', '/api/me'),
  // email is optional ('' = none); it is where a reset link goes
  signup: (username, password, email) =>
    request('POST', '/api/signup', { username, password, email }),
  login: (username, password) =>
    request('POST', '/api/login', { username, password }),
  logout: () => request('POST', '/api/logout'),
  // forgot password: email a reset link, then set a new password with it
  forgotPassword: (email) => request('POST', '/api/password/forgot', { email }),
  resetPassword: (token, password) =>
    request('POST', '/api/password/reset', { token, password }),

  // preferences
  updatePreferences: (prefs) => request('PATCH', '/api/me', prefs),
  // email verification: send a link to the account email, then confirm it
  sendVerifyEmail: () => request('POST', '/api/me/email/verify'),
  verifyEmail: (token) => request('POST', '/api/email/verify', { token }),

  // admin (admins only; everyone else gets 403)
  adminUsers: () => request('GET', '/api/admin/users'),
  adminConfig: () => request('GET', '/api/admin/config'),

  // stats
  stats: () => request('GET', '/api/stats'),
  weeklyStats: (weeks = 12) =>
    request('GET', `/api/stats/weekly?weeks=${weeks}`),
  calendar: (days = 120) => request('GET', `/api/stats/calendar?days=${days}`),

  // measurements (bodyweight)
  measurements: () => request('GET', '/api/measurements'),
  logMeasurement: (weightKg, date) =>
    request(
      'POST',
      '/api/measurements',
      date ? { weight: weightKg, date } : { weight: weightKg },
    ),
  deleteMeasurement: (id) => request('DELETE', `/api/measurements/${id}`),

  // data export (from/to are 'YYYY-MM-DD', inclusive; format 'csv' | 'json')
  downloadExport: ({ from, to, format }) =>
    download(
      `/api/export?${new URLSearchParams({ from, to, format }).toString()}`,
    ),
  emailExport: ({ from, to, format, email }) =>
    request('POST', '/api/export/email', { from, to, format, email }),

  // exercises
  exercises: () => request('GET', '/api/exercises'),
  // the caller's sets for this exercise from their most recent other workout
  lastSets: (exerciseId, excludeWorkoutId) =>
    request(
      'GET',
      `/api/exercises/${exerciseId}/last-sets` +
        (excludeWorkoutId ? `?exclude=${excludeWorkoutId}` : ''),
    ),

  // coach: progress, suggestions, muscle balance, PRs
  exerciseProgress: (exerciseId, limit = 30) =>
    request('GET', `/api/exercises/${exerciseId}/progress?limit=${limit}`),
  exerciseSuggestion: (exerciseId, setNumber, excludeWorkoutId) =>
    request(
      'GET',
      `/api/exercises/${exerciseId}/suggestion?set=${setNumber}` +
        (excludeWorkoutId ? `&exclude=${excludeWorkoutId}` : ''),
    ),
  muscleStats: () => request('GET', '/api/stats/muscles'),
  recommendRoutine: () => request('GET', '/api/routines/recommend'),
  workoutPRs: (workoutId) => request('GET', `/api/workouts/${workoutId}/prs`),
  // AI-written recap of a finished workout (cached server-side)
  workoutRecap: (workoutId) =>
    request('POST', `/api/workouts/${workoutId}/recap`),

  // routines
  routines: () => request('GET', '/api/routines'),
  routine: (id) => request('GET', `/api/routines/${id}`),
  createRoutine: (name) => request('POST', '/api/routines', { name }),
  addRoutineExercise: (routineId, payload) =>
    request('POST', `/api/routines/${routineId}/exercises`, payload),

  // workouts
  workouts: ({ limit = 20, offset = 0 } = {}) =>
    request('GET', `/api/workouts?limit=${limit}&offset=${offset}`),
  workout: (id) => request('GET', `/api/workouts/${id}`),
  startWorkout: (routineId) =>
    request(
      'POST',
      '/api/workouts',
      routineId ? { routine_id: routineId } : {},
    ),
  currentWorkout: () => request('GET', '/api/workouts/current'),
  logSet: (workoutId, payload) =>
    request('POST', `/api/workouts/${workoutId}/sets`, payload),
  editSet: (workoutId, setId, patch) =>
    request('PATCH', `/api/workouts/${workoutId}/sets/${setId}`, patch),
  deleteSet: (workoutId, setId) =>
    request('DELETE', `/api/workouts/${workoutId}/sets/${setId}`),
  finishWorkout: (workoutId) =>
    request('POST', `/api/workouts/${workoutId}/finish`),
  reopenWorkout: (workoutId) =>
    request('POST', `/api/workouts/${workoutId}/reopen`),
  deleteWorkout: (workoutId) => request('DELETE', `/api/workouts/${workoutId}`),
};
