#!/data/data/com.termux/files/usr/bin/bash
# Back up the Gym Tracker SQLite database.
#
#   ./deploy/backup.sh                 # -> ~/gym-tracker-backups/app-<timestamp>.db
#   ./deploy/backup.sh /sdcard/backups # -> custom directory
#
# The database is the ONLY irreplaceable artifact — the code is in GitHub and
# the frontend is rebuilt from it. Run this before every update, and on a
# schedule if you can (e.g. a Termux:Tasks cron entry).

set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Same resolution the server uses.
if [ -f "$REPO_DIR/server/.env" ]; then
  # shellcheck disable=SC1091
  . "$REPO_DIR/server/.env"
fi
DB_PATH="${DB_PATH:-$REPO_DIR/server/data/app.db}"

DEST_DIR="${1:-$HOME/gym-tracker-backups}"
mkdir -p "$DEST_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "no database at $DB_PATH — nothing to back up" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST_DIR/app-$STAMP.db"

# Use SQLite's own online backup — safe even while the server is running.
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  # Fallback: plain copy (fine when the server is stopped).
  cp "$DB_PATH" "$OUT"
fi

echo "backed up -> $OUT  ($(du -h "$OUT" | cut -f1))"

# Keep the 14 most recent backups, delete older ones.
ls -1t "$DEST_DIR"/app-*.db 2>/dev/null | tail -n +15 | while read -r old; do
  rm -f "$old" && echo "pruned old backup: $old"
done
