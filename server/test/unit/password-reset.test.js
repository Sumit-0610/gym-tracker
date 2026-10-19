'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  newToken,
  hashToken,
  isTokenShaped,
  appBaseUrl,
  resetLink,
  resetEmailText,
} = require('../../src/password-reset');
const { isEmail, normalizeEmail } = require('../../src/validation');

/** A stand-in for an Express request with a Host header. */
const req = (host, protocol = 'http') => ({
  protocol,
  get: (name) => (name.toLowerCase() === 'host' ? host : undefined),
});

test('newToken — 64 hex characters, different every time', () => {
  const a = newToken();
  const b = newToken();
  assert.ok(isTokenShaped(a));
  assert.ok(isTokenShaped(b));
  assert.notEqual(a, b);
});

test('hashToken — stable, and never the token itself', () => {
  const t = newToken();
  assert.equal(hashToken(t), hashToken(t));
  assert.notEqual(hashToken(t), t);
  assert.notEqual(hashToken(t), hashToken(newToken()));
});

test('isTokenShaped — rejects anything that is not a token', () => {
  assert.equal(isTokenShaped(undefined), false);
  assert.equal(isTokenShaped(''), false);
  assert.equal(isTokenShaped('abc'), false);
  assert.equal(isTokenShaped('Z'.repeat(64)), false);
  assert.equal(isTokenShaped(`${'a'.repeat(64)}x`), false);
});

test('appBaseUrl — APP_URL wins, then Render, trailing slash dropped', () => {
  const r = req('evil.example');
  assert.equal(
    appBaseUrl({ APP_URL: 'https://gym.example/' }, r),
    'https://gym.example',
  );
  assert.equal(
    appBaseUrl({ RENDER_EXTERNAL_URL: 'https://gym.onrender.com' }, r),
    'https://gym.onrender.com',
  );
});

test('appBaseUrl — production never trusts the Host header', () => {
  assert.equal(
    appBaseUrl({ NODE_ENV: 'production' }, req('evil.example', 'https')),
    null,
  );
});

test('appBaseUrl — local dev uses the request host', () => {
  assert.equal(appBaseUrl({}, req('localhost:5173')), 'http://localhost:5173');
  assert.equal(appBaseUrl({}, req(undefined)), null);
});

test('resetLink and email text carry the token', () => {
  const link = resetLink('https://gym.example', 'abc');
  assert.equal(link, 'https://gym.example/reset-password?token=abc');
  const text = resetEmailText('sam', link);
  assert.match(text, /Hi sam/);
  assert.ok(text.includes(link));
});

test('normalizeEmail and isEmail', () => {
  assert.equal(normalizeEmail('  Me@Gmail.COM '), 'me@gmail.com');
  assert.equal(normalizeEmail(42), '');
  assert.equal(isEmail('me@gmail.com'), true);
  assert.equal(isEmail('me@gmail'), false);
  assert.equal(isEmail('m e@gmail.com'), false);
  assert.equal(isEmail(`${'a'.repeat(250)}@b.co`), false);
});
