#!/usr/bin/env bash
# Reproducible end-to-end API test. Requires: bash, curl, node (all present in Termux).
#
# Usage:
#   1. In one terminal:  cd server && npm start
#   2. In another:        ./test/smoke.sh
#
# Exit code 0 = all checks passed. Any failure prints "FAIL" and exits 1.
#
# The script uses a fresh database each run only if you delete data/app.db first;
# otherwise it tolerates already-existing users by using unique-ish names.

set -u
BASE="${BASE:-http://localhost:3000}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0
check() { # check "label" expected actual
  if [ "$2" = "$3" ]; then
    echo "  ok   $1"
    pass=$((pass + 1))
  else
    echo "  FAIL $1  (expected [$2], got [$3])"
    fail=$((fail + 1))
  fi
}

# helpers ---------------------------------------------------------------------
code() { # code METHOD PATH COOKIEJAR [JSON]
  local method="$1" path="$2" jar="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -o "$TMP/out" -w "%{http_code}" -X "$method" "$BASE$path" \
      -b "$jar" -c "$jar" -H "Content-Type: application/json" -d "$body"
  else
    curl -s -o "$TMP/out" -w "%{http_code}" -X "$method" "$BASE$path" -b "$jar" -c "$jar"
  fi
}
body() { cat "$TMP/out"; }
# jget "EXPR" — parse stdin as JSON into `d`, print the value of the JS EXPR.
jget() {
  node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{const d=JSON.parse(s);console.log(eval(process.argv[1]))})" "$1"
}

A="$TMP/alice.jar"
B="$TMP/bob.jar"
U="user_$$"

echo "== auth =="
check "signup alice"            201 "$(code POST /api/signup "$A" "{\"username\":\"${U}_a\",\"password\":\"secret1\"}")"
check "signup bob"              201 "$(code POST /api/signup "$B" "{\"username\":\"${U}_b\",\"password\":\"secret1\"}")"
check "me (alice) authed"       200 "$(code GET /api/me "$A")"
check "me unauthenticated"      401 "$(code GET /api/me "$TMP/anon.jar")"
check "signup duplicate"        409 "$(code POST /api/signup "$A" "{\"username\":\"${U}_a\",\"password\":\"secret1\"}")"
check "signup missing password" 400 "$(code POST /api/signup "$TMP/x.jar" "{\"username\":\"z\"}")"
check "login wrong password"    401 "$(code POST /api/login "$TMP/x.jar" "{\"username\":\"${U}_a\",\"password\":\"nope\"}")"
check "unknown /api route -> 404"        404 "$(code GET /api/nope/nope "$A")"
check "  ...and it is JSON, not HTML"    "true" "$(body | jget "typeof d.error === 'string'")"

echo "== phase 7: exercises =="
check "exercises unauthenticated" 401 "$(code GET /api/exercises "$TMP/anon.jar")"
code GET /api/exercises "$A" >/dev/null
check "exercise library is non-trivial" "true" "$(body | jget 'd.length >= 40')"
check "exercise rows have id/name/muscle_group" "true" \
  "$(body | jget "d.every(e => 'id' in e && 'name' in e && 'muscle_group' in e)")"
check "no leaked columns"          "true" \
  "$(body | jget "d.every(e => Object.keys(e).length === 3)")"
check "exercises deterministically ordered" "true" \
  "$(body | jget "JSON.stringify(d) === JSON.stringify([...d].sort((x,y)=>(x.muscle_group+x.name).localeCompare(y.muscle_group+y.name)))")"

echo "== phase 8: routines =="
# --- create / validate ---
check "create routine (alice)"      201 "$(code POST /api/routines "$A" '{"name":"Push Day"}')"
RID="$(body | jget 'd.id')"
check "create routine empty name"   400 "$(code POST /api/routines "$A" '{"name":"   "}')"
check "create routine no body"      400 "$(code POST /api/routines "$A" '{}')"
check "create routine ignores client user_id" 201 \
  "$(code POST /api/routines "$A" '{"name":"Pull Day","user_id":999999}')"
RID2="$(body | jget 'd.id')"

# --- list is per-user ---
code GET /api/routines "$A" >/dev/null
check "alice sees her routine"      "true" "$(body | jget "d.some(r=>r.id===$RID)")"
code GET /api/routines "$B" >/dev/null
check "bob does NOT see alice's routine" "false" "$(body | jget "d.some(r=>r.id===$RID)")"

# --- view one: ownership ---
check "alice views her routine"     200 "$(code GET /api/routines/$RID "$A")"
check "  ...has empty exercises[]"  "0" "$(body | jget 'd.exercises.length')"
check "bob CANNOT view alice's routine (404)" 404 "$(code GET /api/routines/$RID "$B")"
check "view nonexistent routine"    404 "$(code GET /api/routines/999999 "$A")"
check "view non-numeric id"         404 "$(code GET /api/routines/abc "$A")"

# --- add exercise: validation + ownership + existence ---
check "add exercise (alice)"        201 "$(code POST /api/routines/$RID/exercises "$A" '{"exercise_id":1,"target_sets":3,"target_reps":10}')"
check "add exercise unknown id"     400 "$(code POST /api/routines/$RID/exercises "$A" '{"exercise_id":999999}')"
check "add exercise missing id"     400 "$(code POST /api/routines/$RID/exercises "$A" '{}')"
check "add exercise bad target"     400 "$(code POST /api/routines/$RID/exercises "$A" '{"exercise_id":1,"target_sets":-2}')"
check "bob CANNOT add to alice's routine (404)" 404 "$(code POST /api/routines/$RID/exercises "$B" '{"exercise_id":2}')"
check "add to nonexistent routine"  404 "$(code POST /api/routines/999999/exercises "$A" '{"exercise_id":1}')"

# --- nested read reflects writes; duplicates allowed ---
code POST /api/routines/$RID/exercises "$A" '{"exercise_id":1}' >/dev/null   # same exercise again
code GET /api/routines/$RID "$A" >/dev/null
check "routine now has 2 exercises (dupes allowed)" "2" "$(body | jget 'd.exercises.length')"
check "  ...first has target_sets 3" "3" "$(body | jget 'd.exercises[0].target_sets')"
check "  ...second has null targets"  "null" "$(body | jget 'String(d.exercises[1].target_sets)')"
check "  ...exercise name joined in"  "true" "$(body | jget "d.exercises.every(e=>typeof e.name==='string' && e.name.length>0)")"

echo "== phase 9: workout logging =="
# --- start a workout ---
check "start workout from routine (alice)" 201 "$(code POST /api/workouts "$A" "{\"routine_id\":$RID}")"
WID="$(body | jget 'd.id')"
check "  ...response has a date"     "true" "$(body | jget "typeof d.date==='string' && d.date.length>0")"
check "start freestyle workout (no body)"  201 "$(code POST /api/workouts "$A" '{}')"
WID_FREE="$(body | jget 'd.id')"
check "  ...routine_id is null"      "null" "$(body | jget 'String(d.routine_id)')"
check "start workout with bad routine_id"   400 "$(code POST /api/workouts "$A" '{"routine_id":999999}')"
check "start workout from BOB's routine"    400 "$(code POST /api/workouts "$B" "{\"routine_id\":$RID}")"

# --- log sets: validation ---
check "log set (alice)"             201 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":1,"reps":10,"weight":60}')"
check "log set weight 0 (bodyweight)" 201 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":12,"set_number":1,"reps":8,"weight":0}')"
check "log set missing reps"        400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":2,"weight":60}')"
check "log set reps 0"              400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":2,"reps":0,"weight":60}')"
check "log set negative weight"     400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":2,"reps":5,"weight":-5}')"
check "log set weight as string"    400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":2,"reps":5,"weight":"60"}')"
check "log set unknown exercise"    400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":999999,"set_number":1,"reps":5,"weight":10}')"

# --- log sets: ownership (the critical test) ---
check "BOB cannot log set to alice's workout (404)" 404 \
  "$(code POST /api/workouts/$WID/sets "$B" '{"exercise_id":1,"set_number":1,"reps":10,"weight":60}')"
check "log set to nonexistent workout (404)" 404 \
  "$(code POST /api/workouts/999999/sets "$A" '{"exercise_id":1,"set_number":1,"reps":10,"weight":60}')"
check "log set to non-numeric workout id (404)" 404 \
  "$(code POST /api/workouts/abc/sets "$A" '{"exercise_id":1,"set_number":1,"reps":10,"weight":60}')"

echo "== phase 10: history =="
code GET /api/workouts "$A" >/dev/null
check "alice history lists her workouts" "2" "$(body | jget 'd.length')"
check "  ...newest first (date DESC, id DESC)" "true" \
  "$(body | jget 'd[0].id >= d[1].id')"
check "  ...routine workout shows routine_name" "true" \
  "$(body | jget "d.some(w=>w.routine_name==='Push Day')")"
check "  ...freestyle workout has null routine_name" "true" \
  "$(body | jget "d.some(w=>w.routine_name===null)")"
check "  ...set_count present on the logged workout" "2" \
  "$(body | jget "d.find(w=>w.id===$WID).set_count")"
check "  ...empty workout has set_count 0" "0" \
  "$(body | jget "d.find(w=>w.id===$WID_FREE).set_count")"
code GET /api/workouts "$B" >/dev/null
check "bob's history is empty" "0" "$(body | jget 'd.length')"

check "alice views workout detail"  200 "$(code GET /api/workouts/$WID "$A")"
check "  ...has sets array of 2"     "2" "$(body | jget 'd.sets.length')"
check "  ...set has exercise_name joined" "true" \
  "$(body | jget "typeof d.sets[0].exercise_name==='string' && d.sets[0].exercise_name.length>0")"
check "  ...set has reps and weight" "true" \
  "$(body | jget "d.sets.every(s=>typeof s.reps==='number' && typeof s.weight==='number')")"
check "bob CANNOT view alice's workout detail (404)" 404 "$(code GET /api/workouts/$WID "$B")"
check "view nonexistent workout (404)" 404 "$(code GET /api/workouts/999999 "$A")"
check "view non-numeric workout id (404)" 404 "$(code GET /api/workouts/abc "$A")"

echo "== phase 12: workout features =="
# --- set types ---
check "log warmup set"              201 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":2,"reps":5,"weight":40,"set_type":"warmup"}')"
check "  ...response has set_type warmup" "warmup" "$(body | jget 'd.set_type')"
check "log set without set_type"     201 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":3,"reps":10,"weight":60}')"
check "  ...defaults to normal"      "normal" "$(body | jget 'd.set_type')"
check "log set invalid set_type"     400 "$(code POST /api/workouts/$WID/sets "$A" '{"exercise_id":1,"set_number":4,"reps":10,"weight":60,"set_type":"megaset"}')"
code GET /api/workouts/$WID "$A" >/dev/null
check "workout detail sets carry set_type" "true" \
  "$(body | jget "d.sets.every(s=>typeof s.set_type==='string')")"

# --- completion state ---
code GET /api/workouts/$WID "$A" >/dev/null
check "workout starts unfinished (completed_at null)" "null" "$(body | jget 'String(d.completed_at)')"
check "finish workout"               200 "$(code POST /api/workouts/$WID/finish "$A")"
check "  ...completed_at is set"      "true" "$(body | jget "typeof d.completed_at==='string' && d.completed_at.length>0")"
check "finish again is idempotent"    200 "$(code POST /api/workouts/$WID/finish "$A")"
check "finish nonexistent workout"    404 "$(code POST /api/workouts/999999/finish "$A")"
check "finish non-numeric id"         404 "$(code POST /api/workouts/abc/finish "$A")"
check "BOB cannot finish alice's workout" 404 "$(code POST /api/workouts/$WID/finish "$B")"
code GET /api/workouts "$A" >/dev/null
check "history: completed_at set on finished workout" "true" \
  "$(body | jget "typeof d.find(w=>w.id===$WID).completed_at==='string'")"
check "history: completed_at null on unfinished workout" "true" \
  "$(body | jget "d.find(w=>w.id===$WID_FREE).completed_at===null")"

# --- resume / current workout ---
code GET /api/workouts/current "$A" >/dev/null
check "current = latest unfinished workout" "$WID_FREE" "$(body | jget 'd.id')"
check "finish the freestyle workout too" 200 "$(code POST /api/workouts/$WID_FREE/finish "$A")"
code GET /api/workouts/current "$A" >/dev/null
check "no unfinished workouts -> current is null" "null" "$(body | jget 'String(d)')"
code GET /api/workouts/current "$B" >/dev/null
check "bob has no current workout" "null" "$(body | jget 'String(d)')"

# --- previous performance ---
check "start a fresh workout"         201 "$(code POST /api/workouts "$A" '{}')"
WID_NEW="$(body | jget 'd.id')"
code POST /api/workouts/$WID_NEW/sets "$A" '{"exercise_id":1,"set_number":1,"reps":9,"weight":62.5}' >/dev/null
code GET "/api/exercises/1/last-sets?exclude=$WID_NEW" "$A" >/dev/null
check "last-sets returns the previous workout's sets" "true" \
  "$(body | jget "d && d.workout_id===$WID && d.sets.length>0")"
check "  ...sets have reps/weight/set_type" "true" \
  "$(body | jget "d.sets.every(s=>typeof s.reps==='number' && typeof s.weight==='number' && typeof s.set_type==='string')")"
check "last-sets unknown exercise -> 404" 404 "$(code GET /api/exercises/999999/last-sets "$A")"
check "last-sets non-numeric id -> 404" 404 "$(code GET /api/exercises/abc/last-sets "$A")"
code GET /api/exercises/5/last-sets "$A" >/dev/null
check "last-sets for a never-done exercise -> null" "null" "$(body | jget 'String(d)')"
code GET /api/exercises/1/last-sets "$B" >/dev/null
check "bob's last-sets for exercise 1 -> null" "null" "$(body | jget 'String(d)')"
code POST /api/workouts/$WID_NEW/finish "$A" >/dev/null

# --- preferences: weight unit + rest timer ---
code GET /api/me "$A" >/dev/null
check "me includes weight_unit (default kg)" "kg" "$(body | jget 'd.weight_unit')"
check "me includes rest_seconds (default 120)" "120" "$(body | jget 'd.rest_seconds')"
check "set weight_unit to lb"         200 "$(code PATCH /api/me "$A" '{"weight_unit":"lb"}')"
check "  ...response shows lb"         "lb" "$(body | jget 'd.weight_unit')"
check "invalid weight_unit rejected"   400 "$(code PATCH /api/me "$A" '{"weight_unit":"stone"}')"
check "set rest_seconds to 90"        200 "$(code PATCH /api/me "$A" '{"rest_seconds":90}')"
check "  ...response shows 90"         "90" "$(body | jget 'd.rest_seconds')"
check "rest_seconds too low rejected"  400 "$(code PATCH /api/me "$A" '{"rest_seconds":5}')"
check "rest_seconds too high rejected" 400 "$(code PATCH /api/me "$A" '{"rest_seconds":9999}')"
check "rest_seconds non-integer rejected" 400 "$(code PATCH /api/me "$A" '{"rest_seconds":90.5}')"
check "PATCH me with no fields -> 400" 400 "$(code PATCH /api/me "$A" '{}')"
code GET /api/me "$A" >/dev/null
check "me now shows lb + 90"           "true" "$(body | jget "d.weight_unit==='lb' && d.rest_seconds===90")"
code PATCH /api/me "$A" '{"weight_unit":"kg","rest_seconds":120}' >/dev/null

# --- stats (training volume) ---
code GET /api/stats "$A" >/dev/null
check "stats: shape"                   "true" \
  "$(body | jget "typeof d.volume==='object' && typeof d.workouts==='object' && typeof d.total_sets==='number'")"
check "stats: all-time volume > 0"     "true" "$(body | jget 'd.volume.all_time > 0')"
check "stats: 7-day <= 30-day <= 365-day <= all-time" "true" \
  "$(body | jget "d.volume.last_7_days <= d.volume.last_30_days && d.volume.last_30_days <= d.volume.last_365_days && d.volume.last_365_days <= d.volume.all_time")"
check "stats: workout counts present" "true" \
  "$(body | jget "d.workouts.all_time >= 1")"
check "stats unauthenticated -> 401"   401 "$(code GET /api/stats "$TMP/anon.jar")"
check "stats: workout_count + week_streak present" "true" \
  "$(code GET /api/stats "$A" >/dev/null; body | jget "typeof d.workout_count==='number' && d.workout_count>=1 && typeof d.week_streak==='number' && d.week_streak>=1")"
code GET /api/stats "$B" >/dev/null
check "bob's stats are all zero"        "true" \
  "$(body | jget "d.volume.all_time === 0 && d.workouts.all_time === 0 && d.total_sets === 0 && d.workout_count === 0 && d.week_streak === 0")"

# --- weekly activity + calendar ---
code GET "/api/stats/weekly?weeks=12" "$A" >/dev/null
check "weekly: 12 buckets, oldest first" "true" \
  "$(body | jget "Array.isArray(d) && d.length===12 && d[0].week_start < d[11].week_start")"
check "weekly: this week has volume + a workout" "true" \
  "$(body | jget "d[11].volume > 0 && d[11].workouts >= 1 && d[11].sets >= 1")"
code GET "/api/stats/weekly?weeks=999" "$A" >/dev/null
check "weekly: weeks clamps to 52"     "52" "$(body | jget 'd.length')"
code GET /api/stats/calendar "$A" >/dev/null
check "calendar: entries have date/count/label" "true" \
  "$(body | jget "Array.isArray(d) && d.length>=1 && d.every(e=>/^\\d{4}-\\d{2}-\\d{2}$/.test(e.date) && typeof e.count==='number' && typeof e.label==='string')")"
code GET /api/stats/calendar "$B" >/dev/null
check "bob's calendar is empty"        "0" "$(body | jget 'd.length')"

# --- measurements (bodyweight log) ---
code GET /api/measurements "$A" >/dev/null
check "measurements start empty"       "0" "$(body | jget 'd.length')"
check "log a bodyweight (new day -> 201)" 201 "$(code POST /api/measurements "$A" '{"weight":82.5,"date":"2026-09-01"}')"
check "  ...response has date + weight" "true" "$(body | jget "d.date==='2026-09-01' && d.weight===82.5")"
check "re-logging the same date (update -> 200)" 200 "$(code POST /api/measurements "$A" '{"weight":83,"date":"2026-09-01"}')"
code GET /api/measurements "$A" >/dev/null
check "  ...still one row, updated weight" "true" "$(body | jget "d.length===1 && d[0].weight===83")"
MID="$(body | jget 'd[0].id')"
check "log without a date defaults today" 201 "$(code POST /api/measurements "$A" '{"weight":83.2}')"
check "reject non-positive weight"     400 "$(code POST /api/measurements "$A" '{"weight":0}')"
check "reject bad date"                400 "$(code POST /api/measurements "$A" '{"weight":80,"date":"01-09-2026"}')"
check "BOB cannot delete alice's measurement" 404 "$(code DELETE /api/measurements/$MID "$B")"
check "delete a measurement"           200 "$(code DELETE /api/measurements/$MID "$A")"
check "delete nonexistent -> 404"      404 "$(code DELETE /api/measurements/999999 "$A")"
code GET /api/measurements "$B" >/dev/null
check "bob's measurements are empty"   "0" "$(body | jget 'd.length')"

echo "== phase 13: edit / delete / pagination =="
# fresh workout, 3 sets of one exercise
check "start workout for edit tests"   201 "$(code POST /api/workouts "$A" '{}')"
WID_ED="$(body | jget 'd.id')"
code POST /api/workouts/$WID_ED/sets "$A" '{"exercise_id":1,"set_number":1,"reps":10,"weight":60}' >/dev/null
S1="$(body | jget 'd.id')"
code POST /api/workouts/$WID_ED/sets "$A" '{"exercise_id":1,"set_number":2,"reps":9,"weight":60}' >/dev/null
S2="$(body | jget 'd.id')"
code POST /api/workouts/$WID_ED/sets "$A" '{"exercise_id":1,"set_number":3,"reps":8,"weight":60}' >/dev/null
S3="$(body | jget 'd.id')"

# --- edit a set ---
check "edit set reps + weight"          200 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$A" '{"reps":12,"weight":65}')"
code GET /api/workouts/$WID_ED "$A" >/dev/null
check "  ...reps updated"               "12" "$(body | jget "d.sets.find(s=>s.id===$S1).reps")"
check "  ...weight updated"             "65" "$(body | jget "d.sets.find(s=>s.id===$S1).weight")"
check "edit set type only"              200 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$A" '{"set_type":"failure"}')"
check "edit set with no fields -> 400"  400 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$A" '{}')"
check "edit set invalid reps -> 400"    400 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$A" '{"reps":0}')"
check "edit set invalid type -> 400"    400 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$A" '{"set_type":"nope"}')"
check "BOB cannot edit alice's set"     404 "$(code PATCH /api/workouts/$WID_ED/sets/$S1 "$B" '{"reps":5}')"
check "edit nonexistent set -> 404"     404 "$(code PATCH /api/workouts/$WID_ED/sets/999999 "$A" '{"reps":5}')"
check "edit set, wrong workout id -> 404" 404 "$(code PATCH /api/workouts/999999/sets/$S1 "$A" '{"reps":5}')"

# --- delete a set + renumber ---
check "delete middle set (S2)"          200 "$(code DELETE /api/workouts/$WID_ED/sets/$S2 "$A")"
code GET /api/workouts/$WID_ED "$A" >/dev/null
check "  ...2 sets remain for the exercise" "2" "$(body | jget "d.sets.filter(s=>s.exercise_id===1).length")"
check "  ...renumbered contiguously to 1,2" "true" \
  "$(body | jget "JSON.stringify(d.sets.filter(s=>s.exercise_id===1).map(s=>s.set_number))==='[1,2]'")"
check "BOB cannot delete alice's set"   404 "$(code DELETE /api/workouts/$WID_ED/sets/$S3 "$B")"
check "delete nonexistent set -> 404"   404 "$(code DELETE /api/workouts/$WID_ED/sets/999999 "$A")"
# the next logged set must not collide with the renumbered ones
code POST /api/workouts/$WID_ED/sets "$A" '{"exercise_id":1,"set_number":3,"reps":7,"weight":60}' >/dev/null
code GET /api/workouts/$WID_ED "$A" >/dev/null
check "  ...next set continues at 3 (no collision)" "true" \
  "$(body | jget "JSON.stringify(d.sets.filter(s=>s.exercise_id===1).map(s=>s.set_number))==='[1,2,3]'")"

# --- reopen a finished workout ---
code POST /api/workouts/$WID_ED/finish "$A" >/dev/null
check "  ...workout is finished"        "true" "$(body | jget 'd.completed_at !== null')"
check "reopen finished workout"         200 "$(code POST /api/workouts/$WID_ED/reopen "$A")"
check "  ...completed_at cleared"       "null" "$(body | jget 'String(d.completed_at)')"
check "BOB cannot reopen alice's workout" 404 "$(code POST /api/workouts/$WID_ED/reopen "$B")"
check "reopen nonexistent workout -> 404" 404 "$(code POST /api/workouts/999999/reopen "$A")"

# --- delete a workout (cascade) ---
check "BOB cannot delete alice's workout" 404 "$(code DELETE /api/workouts/$WID_ED "$B")"
check "delete workout"                  200 "$(code DELETE /api/workouts/$WID_ED "$A")"
check "  ...workout is now 404"         404 "$(code GET /api/workouts/$WID_ED "$A")"
code GET /api/exercises/1/last-sets "$A" >/dev/null
check "  ...no sets orphaned from it"   "true" "$(body | jget "d === null || d.workout_id !== $WID_ED")"
check "delete nonexistent workout -> 404" 404 "$(code DELETE /api/workouts/999999 "$A")"

# --- pagination ---
code GET "/api/workouts?limit=2" "$A" >/dev/null
check "pagination: limit=2 returns 2"   "2" "$(body | jget 'd.length')"
PAGE0="$(body | jget 'd[0].id')"
code GET "/api/workouts?limit=2&offset=2" "$A" >/dev/null
check "pagination: offset=2 returns a later page" "true" \
  "$(body | jget "d.length>=1 && d[0].id !== $PAGE0")"
code GET "/api/workouts?limit=2&offset=999" "$A" >/dev/null
check "pagination: huge offset -> []"   "0" "$(body | jget 'd.length')"
code GET "/api/workouts?limit=999" "$A" >/dev/null
check "pagination: limit clamps to <=100" "true" "$(body | jget 'd.length <= 100')"
code GET "/api/workouts?limit=abc" "$A" >/dev/null
check "pagination: bad limit falls back" "true" "$(body | jget 'Array.isArray(d) && d.length >= 1')"

echo
echo "== two-user authorization summary =="
echo "  alice: routine $RID, workout $WID  |  bob: cannot touch either"
check "regression: alice still authed"   200 "$(code GET /api/me "$A")"
check "regression: exercises still work"  200 "$(code GET /api/exercises "$A")"

echo
echo "passed: $pass   failed: $fail"
[ "$fail" -eq 0 ]
