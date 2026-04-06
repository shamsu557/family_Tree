// routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const db     = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });

  try {
    const [rows] = await db.execute(
      'SELECT * FROM admins WHERE username = ?', [username]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Incorrect username or password.' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match)
      return res.status(401).json({ error: 'Incorrect username or password.' });

    req.session.adminId = admin.id;
    req.session.username = admin.username;
    req.session.role     = admin.role;

    return res.json({ ok: true, username: admin.username, role: admin.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// GET /api/auth/me  — check current session
router.get('/me', (req, res) => {
  if (!req.session.adminId)
    return res.status(401).json({ error: 'Not logged in.' });
  res.json({ username: req.session.username, role: req.session.role });
});

module.exports = router;
