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

echo
echo "passed: $pass   failed: $fail"
[ "$fail" -eq 0 ]
