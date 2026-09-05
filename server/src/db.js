// Database layer: opens the SQLite file, applies the schema, seeds reference data.
//
// We use node:sqlite — SQLite built into the Node binary itself (Node 22.5+).
// Nothing to compile, so no native-addon portability problem on Termux/Android.

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'app.db');
const db = new DatabaseSync(DB_PATH);

// SQLite ships with foreign-key enforcement OFF by default (a backwards-
// compatibility decision from 2009). It must be turned on per connection,
// or every FOREIGN KEY clause in schema.sql is silently ignored.
db.exec('PRAGMA foreign_keys = ON');

function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  require('./seed')(db);
}

module.exports = { db, init };
