'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { adminEmails, isAdmin, configSnapshot } = require('../../src/admin');

const VERIFIED = '2026-10-19 09:00:00';

test('adminEmails — defaults to sumitjad36@gmail.com, env overrides, lowercased', () => {
  assert.deepEqual(adminEmails({}), ['sumitjad36@gmail.com']);
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: ' A@x.co , b@y.co,, ' }), [
    'a@x.co',
    'b@y.co',
  ]);
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: '' }), []);
});

test('isAdmin — needs an admin email AND a verified one', () => {
  const env = {};
  assert.equal(
    isAdmin(
      { email: 'sumitjad36@gmail.com', email_verified_at: VERIFIED },
      env,
    ),
    true,
  );
  // Typing the address into Settings is not enough.
  assert.equal(
    isAdmin({ email: 'sumitjad36@gmail.com', email_verified_at: null }, env),
    false,
  );
  assert.equal(
    isAdmin({ email: 'other@gmail.com', email_verified_at: VERIFIED }, env),
    false,
  );
  assert.equal(
    isAdmin({ email: null, email_verified_at: VERIFIED }, env),
    false,
  );
  assert.equal(isAdmin(undefined, env), false);
});

test('configSnapshot — flags and public values, never secrets', () => {
  const env = {
    NODE_ENV: 'production',
    TZ: 'Asia/Kolkata',
    TURSO_DATABASE_URL: 'libsql://db.turso.io',
    TURSO_AUTH_TOKEN: 'secret-token',
    SESSION_SECRET: 'secret-session',
    GEMINI_API_KEY: 'secret-gemini',
    BREVO_API_KEY: 'secret-brevo',
  };
  const snap = configSnapshot(env, {
    ai: { isConfigured: () => true, model: () => 'gemini-x' },
    mailer: { describe: () => ({ provider: 'Brevo', from: 'me@gmail.com' }) },
    appUrl: 'https://gym.example',
    startedAt: new Date('2026-10-19T00:00:00Z'),
  });
  assert.equal(snap.environment, 'production');
  assert.equal(snap.database, 'Turso (hosted)');
  assert.deepEqual(snap.ai_recap, { enabled: true, model: 'gemini-x' });
  assert.deepEqual(snap.email, {
    enabled: true,
    provider: 'Brevo',
    from: 'me@gmail.com',
  });
  assert.deepEqual(snap.admin_emails, ['sumitjad36@gmail.com']);
  assert.ok(!JSON.stringify(snap).includes('secret'));
});
