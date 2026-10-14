'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mailer = require('../../src/mailer');

const KEYS = ['BREVO_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM'];
const message = {
  to: 'friend@example.com',
  subject: 'Export',
  text: 'Attached.',
  attachment: { filename: 'x.csv', content: 'a,b\r\n' },
};

/** Run `fn` with only `env` set among KEYS and fetch recorded. */
async function withEnv(env, fn, response = { ok: true, status: 200 }) {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  const realFetch = global.fetch;
  const calls = [];
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  global.fetch = /** @type {any} */ (
    async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return { ...response, json: async () => ({ message: 'bad sender' }) };
    }
  );
  try {
    await fn(calls);
  } finally {
    global.fetch = realFetch;
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('parseFrom — name + address, or a bare address', () => {
  assert.deepEqual(mailer.parseFrom('Gym Tracker <me@gmail.com>'), {
    name: 'Gym Tracker',
    email: 'me@gmail.com',
  });
  assert.deepEqual(mailer.parseFrom(' me@gmail.com '), {
    name: undefined,
    email: 'me@gmail.com',
  });
});

test('isConfigured — Brevo needs a sender, Resend does not', async () => {
  await withEnv({}, async () => assert.equal(mailer.isConfigured(), false));
  await withEnv({ BREVO_API_KEY: 'k' }, async () =>
    assert.equal(mailer.isConfigured(), false),
  );
  await withEnv({ BREVO_API_KEY: 'k', EMAIL_FROM: 'me@gmail.com' }, async () =>
    assert.equal(mailer.isConfigured(), true),
  );
  await withEnv({ RESEND_API_KEY: 'k' }, async () =>
    assert.equal(mailer.isConfigured(), true),
  );
});

test('Brevo — sends to the typed address from the verified sender', async () => {
  await withEnv(
    { BREVO_API_KEY: 'bk', EMAIL_FROM: 'Gym Tracker <me@gmail.com>' },
    async (calls) => {
      await mailer.sendMail(message);
      assert.equal(calls.length, 1);
      const { url, init, body } = calls[0];
      assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
      assert.equal(init.headers['api-key'], 'bk');
      assert.deepEqual(body.sender, {
        name: 'Gym Tracker',
        email: 'me@gmail.com',
      });
      assert.deepEqual(body.to, [{ email: 'friend@example.com' }]);
      assert.deepEqual(body.attachment, [
        {
          name: 'x.csv',
          content: Buffer.from('a,b\r\n').toString('base64'),
        },
      ]);
    },
  );
});

test('Brevo wins when both providers are configured', async () => {
  await withEnv(
    { BREVO_API_KEY: 'bk', RESEND_API_KEY: 'rk', EMAIL_FROM: 'me@gmail.com' },
    async (calls) => {
      await mailer.sendMail(message);
      assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
      assert.deepEqual(calls[0].body.sender, { email: 'me@gmail.com' });
    },
  );
});

test('Resend — still works, with its default sender', async () => {
  await withEnv({ RESEND_API_KEY: 'rk' }, async (calls) => {
    await mailer.sendMail(message);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer rk');
    assert.deepEqual(calls[0].body.to, ['friend@example.com']);
  });
});

test('an HTTP error throws with the status and short message', async () => {
  await withEnv(
    { BREVO_API_KEY: 'bk', EMAIL_FROM: 'me@gmail.com' },
    async () => {
      await assert.rejects(
        mailer.sendMail(message),
        /Brevo returned HTTP 400: bad sender/,
      );
    },
    { ok: false, status: 400 },
  );
});

test('no provider -> throws', async () => {
  await withEnv({}, async () => {
    await assert.rejects(mailer.sendMail(message), /no email provider/);
  });
});
