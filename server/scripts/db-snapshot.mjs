// Copy the hosted Turso database into a local SQLite file you can open in
// DBeaver (or any SQLite tool). DBeaver cannot connect to Turso directly — it
// speaks the libSQL HTTP protocol, not the Postgres/MySQL wire protocol — so we
// read every table over the normal query API and write a plain .db file.
//
// Usage (from server/):
//   node --env-file=.env scripts/db-snapshot.mjs
// where .env has TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (copy them from the
// Render dashboard -> Environment, using the eye icon).
//
// Every run builds a fresh copy in a temp file and then swaps it in, so a
// half-finished run never leaves a broken snapshot behind. (An earlier version
// used libSQL's embedded-replica sync, which broke whenever its hidden metadata
// file went missing or the download was cut off.)
//
// Writes made in DBeaver stay local and are NOT pushed back to Turso — this is
// a read-only view of production.

import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;
if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error(
    'Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (e.g. node --env-file=.env scripts/db-snapshot.mjs)',
  );
  process.exit(1);
}

const dataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
);
const outFile = path.join(dataDir, 'gym-tracker-snapshot.db');
const tmpFile = outFile + '.tmp';
fs.mkdirSync(dataDir, { recursive: true });

// Remove a file and its SQLite/replica side files (-wal, -shm, -info, ...).
function removeWithSideFiles(file) {
  const base = path.basename(file);
  for (const name of fs.readdirSync(dataDir)) {
    if (name === base || name.startsWith(base + '-')) {
      fs.rmSync(path.join(dataDir, name), { force: true });
    }
  }
}

const remote = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

removeWithSideFiles(tmpFile);
const local = createClient({ url: 'file:' + tmpFile });

// Tables first, then indexes/views/triggers that depend on them.
const { rows: objects } = await remote.execute(
  `SELECT type, name, sql FROM sqlite_master
   WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'
   ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`,
);

const BATCH = 500;
let tables = 0;
for (const obj of objects) {
  await local.execute(String(obj.sql));
  if (obj.type !== 'table') continue;
  tables++;
  const name = String(obj.name);
  const quoted = '"' + name.replaceAll('"', '""') + '"';
  // Page by rowid so large tables never come back in one huge response.
  let last = Number.MIN_SAFE_INTEGER;
  for (;;) {
    const { rows, columns } = await remote.execute({
      sql: `SELECT rowid AS __rowid, * FROM ${quoted} WHERE rowid > ? ORDER BY rowid LIMIT ${BATCH}`,
      args: [last],
    });
    if (rows.length === 0) break;
    const cols = columns.slice(1);
    const insert = `INSERT INTO ${quoted} (${cols
      .map((c) => '"' + c.replaceAll('"', '""') + '"')
      .join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    await local.batch(
      rows.map((r) => ({ sql: insert, args: cols.map((c) => r[c]) })),
      'write',
    );
    last = Number(rows[rows.length - 1].__rowid);
    if (rows.length < BATCH) break;
  }
}

const { rows: count } = await local.execute('SELECT COUNT(*) AS n FROM users');
local.close();
remote.close();

try {
  removeWithSideFiles(outFile);
  fs.renameSync(tmpFile, outFile);
} catch (err) {
  console.error(
    `Could not replace ${outFile} (${err.code ?? err.message}).\n` +
      'It is probably open in DBeaver: disconnect it there (or close DBeaver) and run this again.',
  );
  process.exit(1);
}

console.log(`Copied ${tables} tables, ${count[0].n} users -> ${outFile}`);
console.log(
  'Open that file in DBeaver: New Connection -> SQLite -> Path (press F5 to refresh).',
);
process.exit(0);
