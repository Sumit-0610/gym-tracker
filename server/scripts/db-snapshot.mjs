// Pull the hosted Turso database into a local SQLite file you can open in
// DBeaver (or any SQLite tool). DBeaver cannot connect to Turso directly — it
// speaks the libSQL HTTP protocol, not the Postgres/MySQL wire protocol — so we
// use libSQL's embedded-replica sync to materialise a plain .db file.
//
// Usage (from server/):
//   node --env-file=.env scripts/db-snapshot.mjs
// where .env has TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (copy them from the
// Render dashboard -> Environment, using the eye icon).
//
// Re-run any time to refresh the snapshot. Writes made in DBeaver stay local and
// are NOT pushed back to Turso — this is a read-only view of production.

import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;
if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error(
    'Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (e.g. node --env-file=.env scripts/db-snapshot.mjs)',
  );
  process.exit(1);
}

const outFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'gym-tracker-snapshot.db',
);

const db = createClient({
  url: 'file:' + outFile,
  syncUrl: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

await db.sync();
const { rows } = await db.execute('SELECT COUNT(*) AS n FROM users');
console.log(`Synced ${rows[0].n} users -> ${outFile}`);
console.log('Open that file in DBeaver: New Connection -> SQLite -> Path.');
process.exit(0);
