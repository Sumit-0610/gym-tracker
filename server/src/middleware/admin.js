// Route guard for the admin pages. Runs after requireAuth (req.userId is set)
// and re-reads the user on every request, so removing someone's email or
// changing ADMIN_EMAILS takes effect at once rather than at next login.

const { get } = require('../db');
const { isAdmin } = require('../admin');

module.exports = async function requireAdmin(req, res, next) {
  try {
    const user = await get(
      'SELECT email, email_verified_at FROM users WHERE id = ?',
      req.userId,
    );
    if (!isAdmin(user)) {
      return res.status(403).json({ error: 'Admins only.' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
