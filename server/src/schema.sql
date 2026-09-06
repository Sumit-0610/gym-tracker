-- Schema for the gym tracker. Every statement uses IF NOT EXISTS so this file
-- can be run on every server start without error (it only creates what's missing).

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
  weight_unit   TEXT NOT NULL DEFAULT 'kg'   -- 'kg' | 'lb'; weights are stored in kg, converted for display
);

-- Shared exercise library (not per-user). Seeded on first boot.
CREATE TABLE IF NOT EXISTS exercises (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  muscle_group TEXT
);

-- User-created routines (templates).
CREATE TABLE IF NOT EXISTS routines (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name    TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Which exercises belong to a routine, plus per-routine targets.
CREATE TABLE IF NOT EXISTS routine_exercises (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id  INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  target_sets INTEGER,
  target_reps INTEGER,
  FOREIGN KEY (routine_id) REFERENCES routines(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- A logged workout session.
CREATE TABLE IF NOT EXISTS workouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  routine_id   INTEGER,  -- nullable: a freestyle workout has no routine
  date         TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,     -- nullable: NULL = in progress, timestamp = finished
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (routine_id) REFERENCES routines(id)
);

-- express-session store (V2 — see src/session-store.js). Sessions used to live
-- in memory; a redeploy-heavy host needs them to survive a restart.
--   sid    = session id (from the signed cookie)
--   sess   = the session object, JSON-encoded
--   expire = absolute expiry, unix-epoch milliseconds
CREATE TABLE IF NOT EXISTS sessions (
  sid    TEXT PRIMARY KEY,
  sess   TEXT NOT NULL,
  expire INTEGER NOT NULL
);

-- The actual sets performed during a logged workout.
CREATE TABLE IF NOT EXISTS workout_sets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id  INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  set_number  INTEGER,
  reps        INTEGER,
  weight      REAL,   -- always kilograms; the client converts for lb users
  set_type    TEXT NOT NULL DEFAULT 'normal',  -- 'normal' | 'warmup' | 'dropset' | 'failure'
  FOREIGN KEY (workout_id) REFERENCES workouts(id),
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
