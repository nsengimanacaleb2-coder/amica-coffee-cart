const jwt = require('jsonwebtoken');

// Verifies the JWT sent in the Authorization header and attaches the user to req.user
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

// Use after requireAuth to restrict a route to admins only
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
