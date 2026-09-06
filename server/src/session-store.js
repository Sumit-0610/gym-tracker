// A minimal express-session store backed by libSQL.
//
// V1 used express-session's default in-memory store: fine on a machine that
// runs for weeks, but the V2 host redeploys and scales to zero, and every
// restart would drop all sessions and log everyone out. Persisting sessions in
// the database fixes that — the store is small enough to own outright rather
// than pull in a dependency.
//
// Table (created in schema.sql):
//   sessions(sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expire INTEGER NOT NULL)
//   `expire` is a unix-epoch millisecond timestamp.

const { Store } = require('express-session');
const { run, get } = require('./db');

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

// When does this session expire? express-session puts an absolute `expires`
// Date on the cookie; fall back to maxAge, then to a week.
function expiryOf(sess) {
  const expires = sess && sess.cookie && sess.cookie.expires;
  if (expires) return new Date(expires).getTime();
  const maxAge = sess && sess.cookie && sess.cookie.originalMaxAge;
  return Date.now() + (maxAge || WEEK_MS);
}

class LibsqlStore extends Store {
  constructor() {
    super();
    // Sweep expired rows hourly. unref() so this timer never keeps the process
    // alive on its own (important on a scale-to-zero host).
    this._sweep = setInterval(() => {
      run('DELETE FROM sessions WHERE expire < ?', Date.now()).catch(() => {});
    }, 1000 * 60 * 60);
    this._sweep.unref();
  }

  async get(sid, cb) {
    try {
      const row = await get('SELECT sess, expire FROM sessions WHERE sid = ?', sid);
      if (!row) return cb(null, null);
      if (row.expire < Date.now()) {
        await run('DELETE FROM sessions WHERE sid = ?', sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  async set(sid, sess, cb) {
    try {
      await run(
        `INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire`,
        sid,
        JSON.stringify(sess),
        expiryOf(sess)
      );
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  // Called (instead of set) when resave:false and the session was only read.
  // Pushes the expiry forward so active sessions don't lapse.
  async touch(sid, sess, cb) {
    try {
      await run('UPDATE sessions SET expire = ? WHERE sid = ?', expiryOf(sess), sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  async destroy(sid, cb) {
    try {
      await run('DELETE FROM sessions WHERE sid = ?', sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }
}

module.exports = LibsqlStore;
