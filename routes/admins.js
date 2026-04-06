// routes/admins.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const db     = require('../config/db');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

// GET /api/admins  — list all admins (superAdmin only)
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, role, created_at FROM admins ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/admins  — create admin (superAdmin only)
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      `INSERT INTO admins (username, password, role) VALUES (?, ?, 'admin')`,
      [username.trim(), hash]
    );
    res.status(201).json({
      id: result.insertId,
      username: username.trim(),
      role: 'admin',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username already exists.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/admins/:id  — delete admin (superAdmin only, cannot delete self)
router.delete('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.session.adminId)
    return res.status(400).json({ error: 'Cannot delete your own account.' });
  try {
    const [rows] = await db.execute('SELECT role FROM admins WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Admin not found.' });
    if (rows[0].role === 'superadmin')
      return res.status(400).json({ error: 'Cannot delete a superAdmin.' });
    await db.execute('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/admins/change-password  — change own password
router.put('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Both passwords required.' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.session.adminId]);
    const match = await bcrypt.compare(current_password, rows[0].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE admins SET password = ? WHERE id = ?', [hash, req.session.adminId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
