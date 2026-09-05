#!/data/data/com.termux/files/usr/bin/bash
# Start the Gym Tracker backend on the phone.
#
#   ./deploy/start.sh
#
# Keeps running in the foreground. To keep it alive when you close Termux:
#   - run `termux-wake-lock` first (once per boot)
#   - set Termux battery usage to "Unrestricted" in Android settings
#   - or run this under `nohup ./deploy/start.sh > ~/gym-tracker.log 2>&1 &`

set -eu

# Resolve the repo root (this script lives in <repo>/deploy).
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR/server"

# Load deployment config if present (server/.env — gitignored).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  echo "loaded server/.env"
fi

# Fail loudly if node:sqlite isn't available on this Node build.
node -e "require('node:sqlite')" 2>/dev/null || {
  echo "ERROR: this Node build has no node:sqlite (need Node >= 22.5)." >&2
  echo "       node -v  ->  $(node -v)" >&2
  exit 1
}

echo "starting gym-tracker API"
echo "  repo:    $REPO_DIR"
echo "  node:    $(node -v)"
echo "  DB_PATH: ${DB_PATH:-$REPO_DIR/server/data/app.db}"
echo "  HOST:    ${HOST:-127.0.0.1}   PORT: ${PORT:-3000}"
exec npm start
