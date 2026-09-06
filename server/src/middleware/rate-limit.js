// Rate limiters for the auth endpoints.
//
// Once the app is reachable from the public internet, brute-forcing a password
// and mass-registering accounts are the obvious abuse vectors — every other
// endpoint is behind requireAuth. These two limiters cap both.
//
// Keying on client IP: behind Render's proxy the real address is the first hop
// in X-Forwarded-For. index.js sets `trust proxy` in production so
// express-rate-limit reads it correctly; in local dev it keys on 127.0.0.1.

const rateLimit = require('express-rate-limit');

const tooMany = (req, res) =>
  res.status(429).json({
    error: 'Too many attempts. Please wait a few minutes and try again.',
  });

// Failed logins only: `skipSuccessfulRequests` means a 2xx response is not
// counted, so a legitimate user is never rate-limited — only an attacker
// racking up wrong-password 401s. 10 misses per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany,
});

// New accounts from one IP: 20 per hour (well above any legitimate use for a
// ~10-person app; blocks a script creating thousands).
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany,
});

module.exports = { loginLimiter, signupLimiter };
