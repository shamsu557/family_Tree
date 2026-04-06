// middleware/auth.js — protect admin API routes

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({ error: 'Unauthorised. Please log in.' });
}

function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.role === 'superadmin') return next();
  return res.status(403).json({ error: 'Forbidden. SuperAdmin only.' });
}

module.exports = { requireAuth, requireSuperAdmin };
