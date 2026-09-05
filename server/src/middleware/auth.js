// Route guard for anything that requires a logged-in user.
//
// express-session has already run by the time this executes, so req.session
// is populated from the session cookie. If our login handler put a userId on
// the session, the user is authenticated; otherwise reject with 401 before
// the request reaches the handler.

module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.userId = req.session.userId; // convenience for handlers
  next();
};
