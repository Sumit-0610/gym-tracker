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

echo "== phase 7: exercises =="
check "exercises unauthenticated" 401 "$(code GET /api/exercises "$TMP/anon.jar")"
code GET /api/exercises "$A" >/dev/null
check "exercises count == 21"      21 "$(body | jget 'd.length')"
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

# --- weight unit preference ---
code GET /api/me "$A" >/dev/null
check "me includes weight_unit (default kg)" "kg" "$(body | jget 'd.weight_unit')"
check "set weight_unit to lb"         200 "$(code PATCH /api/me "$A" '{"weight_unit":"lb"}')"
check "  ...response shows lb"         "lb" "$(body | jget 'd.weight_unit')"
check "invalid weight_unit rejected"   400 "$(code PATCH /api/me "$A" '{"weight_unit":"stone"}')"
code GET /api/me "$A" >/dev/null
check "me now shows lb"                "lb" "$(body | jget 'd.weight_unit')"
code PATCH /api/me "$A" '{"weight_unit":"kg"}' >/dev/null

echo
echo "== two-user authorization summary =="
echo "  alice: routine $RID, workout $WID  |  bob: cannot touch either"
check "regression: alice still authed"   200 "$(code GET /api/me "$A")"
check "regression: exercises still work"  200 "$(code GET /api/exercises "$A")"

echo
echo "passed: $pass   failed: $fail"
[ "$fail" -eq 0 ]
