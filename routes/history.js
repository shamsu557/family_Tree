// routes/history.js
const router = require('express').Router();
const db     = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/history  — public
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM history ORDER BY sort_order ASC, id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/history  — admin only
router.post('/', requireAuth, async (req, res) => {
  const { year_label, title, body, sort_order } = req.body;
  if (!year_label || !title || !body)
    return res.status(400).json({ error: 'year_label, title and body required.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO history (year_label, title, body, sort_order) VALUES (?,?,?,?)',
      [year_label, title, body, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId, year_label, title, body });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/history/:id  — admin only
router.put('/:id', requireAuth, async (req, res) => {
  const { year_label, title, body, sort_order } = req.body;
  try {
    await db.execute(
      'UPDATE history SET year_label=?, title=?, body=?, sort_order=? WHERE id=?',
      [year_label, title, body, sort_order || 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/history/:id  — admin only
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.execute('DELETE FROM history WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
