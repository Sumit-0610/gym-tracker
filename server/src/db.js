// Database layer: connects to libSQL, applies the schema, seeds reference data.
//
// V1 used node:sqlite — SQLite compiled into the Node binary, reading a local
// file. V2 runs on a free host that has NO persistent disk, so a local file
// would be wiped on every deploy. The database therefore moved to Turso, a
// hosted libSQL service (libSQL is an open fork of SQLite).
//
// The @libsql/client library talks to a remote Turso database and to a plain
// local file with the SAME api, so local development and the test suite still
// use a file on disk with zero configuration — only the URL differs.

const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@libsql/client');

// In the cloud, TURSO_DATABASE_URL is set (e.g. libsql://gym-tracker-xxx.turso.io)
// and TURSO_AUTH_TOKEN authenticates the connection.
// Unset -> a local file at server/data/app.db, so `npm start` and smoke.sh need
// no setup. DB_PATH still overrides the local file location if you want it
// elsewhere (it is ignored when TURSO_DATABASE_URL is set).
const remoteUrl = process.env.TURSO_DATABASE_URL;
let url;
if (remoteUrl) {
  url = remoteUrl;
} else {
  const localPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  url = 'file:' + localPath;
}

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN, // needed for remote; harmless/ignored for file: URLs
});

// @libsql/client is fully asynchronous — every query returns a Promise. These
// three wrappers keep the route code reading the way it did under node:sqlite:
//
//   const row  = await get('SELECT ... WHERE id = ?', id);
//   const rows = await all('SELECT ...');
//   const { lastInsertRowid } = await run('INSERT ...', a, b);
//
// A result set exposes { rows, rowsAffected, lastInsertRowid }. `rows[0]` is
// undefined when nothing matched — same as node:sqlite's .get().
const get = async (sql, ...args) => (await db.execute({ sql, args })).rows[0];
const all = async (sql, ...args) => (await db.execute({ sql, args })).rows;
const run = async (sql, ...args) => {
  const r = await db.execute({ sql, args });
  return { lastInsertRowid: r.lastInsertRowid, rowsAffected: r.rowsAffected };
};

// Columns added after the original schema shipped. `schema.sql` already carries
// them for a fresh database; this brings an existing one up to date. Each is a
// no-op once the column exists. SQLite/libSQL has no "ADD COLUMN IF NOT EXISTS",
// so we check PRAGMA table_info first. (Table/column names here are constants,
// never user input.)
const MIGRATIONS = [
  ['workouts', 'completed_at', 'TEXT'],
  ['workout_sets', 'set_type', "TEXT NOT NULL DEFAULT 'normal'"],
  ['users', 'weight_unit', "TEXT NOT NULL DEFAULT 'kg'"],
];

async function migrate() {
  for (const [table, column, definition] of MIGRATIONS) {
    const info = await db.execute(`PRAGMA table_info(${table})`);
    if (info.rows.some((r) => r.name === column)) continue;
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`migrated: added ${table}.${column}`);
  }
}

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // executeMultiple runs the whole schema.sql script (multiple statements,
  // SQL comments) in one call. Every statement is CREATE TABLE IF NOT EXISTS,
  // so this is safe on every boot.
  await db.executeMultiple(schema);
  await migrate();
  // libSQL enforces FOREIGN KEY constraints by default (unlike bare SQLite,
  // which needed `PRAGMA foreign_keys = ON` per connection), so there is
  // nothing to switch on here.
  await require('./seed')(db);
}

module.exports = { db, init, get, all, run };
