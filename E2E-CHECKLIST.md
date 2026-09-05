# Gym Tracker — manual E2E checklist

Reproducible browser checklist for the frontend. Pair it with the backend's
`server/test/smoke.sh` (65 automated checks). No framework — a human runs this.

## Setup

```bash
cd server && rm -f data/app.db && npm start     # fresh DB, API on :3000
cd client && npm run dev                         # UI on :5173
```

Open http://localhost:5173 in a mobile viewport (~375px; also spot-check 320px).
Use **two accounts** — call them **A** and **B**.

---

## Authentication

- [ ] Visiting `/` while logged out → redirected to `/login`
- [ ] Sign up A (`secret1`) → lands on dashboard, greets by username
- [ ] Hard refresh on dashboard → still logged in
- [ ] Log out → `/login`; `GET /api/me` returns 401; protected pages redirect to `/login`
- [ ] Log in A with the right password → dashboard
- [ ] Log in with a wrong password → "Invalid username or password.", stays on `/login`
- [ ] Log in while the API is down → "Could not reach the server…", button not stuck
- [ ] Rapid double-click "Log in" / "Sign up" → only one request

## Exercises  (`/exercises`)

- [ ] Loading spinner, then 21 exercises
- [ ] Search "squat" and "SQUAT" → same result (case-insensitive)
- [ ] Search a muscle ("chest") → matches by muscle group
- [ ] Search "zzzq" → "No exercises match …" (distinct from an empty library)
- [ ] Clear search → all 21 return; no network request fired per keystroke
- [ ] Force `GET /api/exercises` to fail → error box + "Try again" → recovers

## Routines  (`/routines`, `/routines/:id`)

- [ ] Empty state "No routines yet"
- [ ] Create with a blank name → inline "Enter a routine name.", no request
- [ ] Create "Full Body" → appears in the list
- [ ] Rapid double-submit "Create routine" → only one routine
- [ ] Open the routine → "No exercises in this routine"
- [ ] Add an exercise (with target sets/reps) → appears with "N sets × M reps"
- [ ] Add the same exercise again → both rows shown (duplicates allowed)
- [ ] Add with `target_sets = 0` → inline error, no request
- [ ] `/routines/999999` → "Routine not found"
- [ ] As B, `/routines/<A's id>` → "Routine not found"

## Workout — routine  (`/workout` → `/workout/:id`)

- [ ] `/workout`: choose "Follow a routine", pick "Full Body", Start
- [ ] Double-click Start → exactly one workout created
- [ ] Active screen shows the routine name + "Today's plan" chips
- [ ] Tap a chip → it pre-selects the exercise in the form
- [ ] Enter reps + weight, Log set → row appears **after** the server responds
- [ ] Double-submit "Log set" → exactly one set
- [ ] Log a 2nd set of the same exercise → "Set 2"; exercise/reps/weight kept
- [ ] Switch exercise → set number resets to 1 for that exercise
- [ ] Decimal weight (`22.5`) logs; weight `0` shows as "bodyweight"
- [ ] reps `0` → error, no request; negative weight → error; weight as text → error
- [ ] Log a set with the API down → error shown, set list unchanged, button re-enabled
- [ ] `/workout/999999` and B opening A's `/workout/:id` → "Workout not found"

## Workout — freestyle

- [ ] `/workout`: choose "Freestyle", Start (if A has no routines, this is the only option)
- [ ] Active screen says "Freestyle workout" — **no** plan card, no fake routine
- [ ] Select an exercise from the full library, log a set → appears

## Active workout refresh

- [ ] Start a workout, log 2–3 sets
- [ ] Hard refresh `/workout/:id` → workout + all logged sets reconstructed
- [ ] Refresh bare `/workout` (no id) → start screen (known limitation, not "resume")

## History  (`/history`, `/history/:id`)

- [ ] Empty history → "No workouts yet" + "Start a workout"
- [ ] With workouts: newest first (matches server order, no client sort)
- [ ] Routine workout row shows the routine name; freestyle shows "Freestyle"
- [ ] Set count is correct, "1 set" vs "N sets"
- [ ] Open a workout → date, "Routine|Freestyle · …", sets grouped by exercise
- [ ] Exercise names, set numbers, reps, weight (incl. "bodyweight") all correct
- [ ] Open a zero-set workout → "No sets logged" (not an error)
- [ ] `/history/999999` and B opening A's `/history/:id` → "Workout not found"
- [ ] Force `GET /api/workouts` to fail → error + retry
- [ ] Hard refresh `/history/:id` → rebuilds cleanly
- [ ] Browser Back from detail → `/history`

## Security — second user

- [ ] B's routines and history are empty
- [ ] B cannot open A's routine / workout / history detail (all → "not found")
- [ ] `POST /api/workouts/<A's id>/sets` as B → 404, and A's set count is unchanged
- [ ] `POST /api/workouts {routine_id: <A's id>}` as B → 400
- [ ] After all of the above, A still sees every routine, workout and set

## Navigation

- [ ] Bottom nav: tapping each tab navigates; the current tab is highlighted
- [ ] Nav tab stays highlighted on sub-routes (`/history/5` keeps "History" lit)
- [ ] Browser Back / Forward move through visited screens correctly
- [ ] Unknown route (`/nonsense`) → "Not found" with a working "Go home" link
- [ ] Every deep link (`/routines/1`, `/history/1`, `/workout/1`) survives a hard refresh

## Responsive

- [ ] At 320px and 375px: `document.documentElement.scrollWidth === window.innerWidth`
      on every screen (no horizontal scroll)
- [ ] Long routine / exercise names wrap, don't push layout wide
- [ ] All 5 bottom-nav items fit on one line at 320px
- [ ] Desktop: content is centred and capped (~560px), not stretched

## Accessibility

- [ ] Every input / select has a visible `<label>`
- [ ] One `<h1>` per page; heading levels don't skip (h1 → h2 → h3)
- [ ] Tab key reaches every control; focused control shows a visible outline
- [ ] Buttons and links have meaningful text (no icon-only mystery controls)
- [ ] Set lists use real `<ul>`/`<ol>`; exercise names are `<h3>` headings
- [ ] Errors and status are conveyed by text, not colour alone
- [ ] Pending buttons are disabled and relabelled ("Starting…", "Logging…")
