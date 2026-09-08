#!/data/data/com.termux/files/usr/bin/bash
# Quick "is the deployment healthy?" check. Run it on the phone any time.
#
#   ./deploy/health-check.sh
#
# Exits 0 only if every check passes.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$REPO_DIR/server/.env" ]; then . "$REPO_DIR/server/.env"; fi
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
DB_PATH="${DB_PATH:-$REPO_DIR/server/data/app.db}"
NGINX_PORT="${NGINX_PORT:-8080}"

fail=0
ok()   { echo "  ok    $1"; }
bad()  { echo "  FAIL  $1"; fail=1; }

echo "== processes =="
pgrep -f 'node .*src/index.js' >/dev/null && ok "node (Express) running" || bad "node not running"
# not `pgrep -x nginx`: nginx renames its processes to "nginx: master process ..."
pgrep -f 'nginx: master' >/dev/null || pgrep nginx >/dev/null \
  && ok "nginx running" || bad "nginx not running"

echo "== database =="
[ -f "$DB_PATH" ]  && ok "db file exists: $DB_PATH" || bad "db missing: $DB_PATH"
[ -w "$DB_PATH" ]  && ok "db writable"              || bad "db not writable"

echo "== backend (direct) =="
code=$(curl -s -o /dev/null -w '%{http_code}' "http://$HOST:$PORT/")
[ "$code" = "200" ] && ok "GET http://$HOST:$PORT/  -> 200" || bad "backend / -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://$HOST:$PORT/api/me")
[ "$code" = "401" ] && ok "GET /api/me (no session) -> 401" || bad "/api/me -> $code (expected 401)"

echo "== full app (through nginx) =="
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NGINX_PORT/")
[ "$code" = "200" ] && ok "nginx / -> 200 (frontend served)" || bad "nginx / -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NGINX_PORT/history/1")
[ "$code" = "200" ] && ok "nginx /history/1 -> 200 (SPA fallback)" || bad "SPA fallback -> $code"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NGINX_PORT/api/me")
[ "$code" = "401" ] && ok "nginx /api/me -> 401 (proxied, not index.html)" || bad "nginx /api proxy -> $code"

echo "== session round-trip through nginx =="
# Uses one fixed throwaway account, created only if it doesn't exist yet — so
# repeated health checks don't litter the users table. Password is not secret:
# this account owns no real data.
jar="$(mktemp)"
hu="__healthcheck__"
hp="healthcheck-pw"
login=$(curl -s -o /dev/null -w '%{http_code}' -c "$jar" -X POST "http://127.0.0.1:$NGINX_PORT/api/login" \
      -H 'Content-Type: application/json' -d "{\"username\":\"$hu\",\"password\":\"$hp\"}")
if [ "$login" != "200" ]; then
  curl -s -o /dev/null -c "$jar" -X POST "http://127.0.0.1:$NGINX_PORT/api/signup" \
      -H 'Content-Type: application/json' -d "{\"username\":\"$hu\",\"password\":\"$hp\"}"
  login=$(curl -s -o /dev/null -w '%{http_code}' -c "$jar" -X POST "http://127.0.0.1:$NGINX_PORT/api/login" \
      -H 'Content-Type: application/json' -d "{\"username\":\"$hu\",\"password\":\"$hp\"}")
fi
me=$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "http://127.0.0.1:$NGINX_PORT/api/me")
rm -f "$jar"
{ [ "$login" = "200" ] && [ "$me" = "200" ]; } \
  && ok "login ($login) then /api/me with cookie ($me) — sessions work through nginx" \
  || bad "session round-trip: login=$login me=$me"

echo
[ "$fail" = 0 ] && echo "HEALTHY" || echo "UNHEALTHY — see FAILs above"
exit $fail
