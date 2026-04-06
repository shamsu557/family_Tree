// routes/members.js
const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const db     = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// ── Multer setup ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `member_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// ── GET /api/members ── all members (public) ─────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, first_name, middle_name, surname, nickname,
              gender, dob, state, lga, address, photo,
              parent_id, generation, created_at
       FROM members ORDER BY generation ASC, id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/members/stats ── dashboard stats (admin) ────────
// IMPORTANT: declared before /:id so "stats" is not treated as an id
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [[{ total }]]    = await db.execute('SELECT COUNT(*) as total FROM members');
    const [[{ gens }]]     = await db.execute('SELECT MAX(generation) as gens FROM members');
    const [[{ headKids }]] = await db.execute(
      `SELECT COUNT(*) as headKids FROM members
       WHERE parent_id = (SELECT id FROM members WHERE parent_id IS NULL LIMIT 1)`
    );
    const [[{ admCount }]] = await db.execute('SELECT COUNT(*) as admCount FROM admins');
    const [[{ females }]]  = await db.execute(`SELECT COUNT(*) as females FROM members WHERE gender='Female'`);
    const [[{ males }]]    = await db.execute(`SELECT COUNT(*) as males   FROM members WHERE gender='Male'`);
    res.json({ total, generations: gens || 0, headChildren: headKids, admins: admCount, females, males });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/members/recent ── last 5 added (admin) ──────────
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, first_name, surname, nickname, gender, generation, photo, created_at
       FROM members ORDER BY created_at DESC LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/members/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/members ── add member (admin) ──────────────────
router.post('/', requireAuth, upload.single('photo'), async (req, res) => {
  const { first_name, middle_name, surname, nickname,
          gender, dob, state, lga, address, parent_id } = req.body;

  if (!first_name || !surname || !gender)
    return res.status(400).json({ error: 'first_name, surname and gender are required.' });

  try {
    let generation = 1;
    const pid = (parent_id && parent_id !== '' && parent_id !== 'null')
      ? parseInt(parent_id) : null;

    if (pid) {
      const [par] = await db.execute('SELECT generation FROM members WHERE id = ?', [pid]);
      if (!par.length) return res.status(400).json({ error: 'Parent not found.' });
      generation = par[0].generation + 1;
    } else {
      const [[{ cnt }]] = await db.execute(
        `SELECT COUNT(*) as cnt FROM members WHERE parent_id IS NULL`
      );
      if (cnt > 0) return res.status(400).json({ error: 'A family head already exists.' });
    }

    const photo = req.file ? req.file.filename : '';
    const [result] = await db.execute(
      `INSERT INTO members
         (first_name, middle_name, surname, nickname, gender,
          dob, state, lga, address, photo, parent_id, generation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        first_name.trim(), (middle_name || '').trim(), surname.trim(),
        (nickname || '').trim(), gender, dob || null,
        (state || '').trim(), (lga || '').trim(), (address || '').trim(),
        photo, pid, generation,
      ]
    );

    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/members/:id ── edit member (admin) ──────────────
router.put('/:id', requireAuth, upload.single('photo'), async (req, res) => {
  const { first_name, middle_name, surname, nickname,
          gender, dob, state, lga, address, parent_id } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Not found.' });
    const m = existing[0];

    let pid;
    if (parent_id === undefined)                         pid = m.parent_id;
    else if (parent_id === '' || parent_id === 'null')   pid = null;
    else                                                 pid = parseInt(parent_id);

    let generation = m.generation;
    if (pid !== m.parent_id) {
      if (pid === null) {
        generation = 1;
      } else {
        const [par] = await db.execute('SELECT generation FROM members WHERE id = ?', [pid]);
        if (!par.length) return res.status(400).json({ error: 'Parent not found.' });
        generation = par[0].generation + 1;
      }
    }

    let photo = m.photo;
    if (req.file) {
      if (photo) {
        const old = path.join(__dirname, '..', 'public', 'uploads', photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      photo = req.file.filename;
    }

    await db.execute(
      `UPDATE members SET
         first_name=?, middle_name=?, surname=?, nickname=?, gender=?,
         dob=?, state=?, lga=?, address=?, photo=?, parent_id=?, generation=?
       WHERE id=?`,
      [
        (first_name  !== undefined ? first_name  : m.first_name ).trim(),
        (middle_name !== undefined ? middle_name : m.middle_name).trim(),
        (surname     !== undefined ? surname     : m.surname    ).trim(),
        (nickname    !== undefined ? nickname    : m.nickname   ).trim(),
        gender || m.gender,
        dob !== undefined ? (dob || null) : m.dob,
        (state   !== undefined ? state   : m.state  ).trim(),
        (lga     !== undefined ? lga     : m.lga    ).trim(),
        (address !== undefined ? address : m.address).trim(),
        photo, pid, generation, req.params.id,
      ]
    );

    await cascadeGenerations(parseInt(req.params.id), generation, db);

    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/members/:id ── delete member (admin) ─────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM members WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found.' });
    const m = rows[0];
    if (!m.parent_id)
      return res.status(400).json({ error: 'Cannot delete the family head.' });

    if (m.photo) {
      const p = path.join(__dirname, '..', 'public', 'uploads', m.photo);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await db.execute('UPDATE members SET parent_id=? WHERE parent_id=?', [m.parent_id, m.id]);
    await db.execute('DELETE FROM members WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── Cascade generation recalculation ─────────────────────────
async function cascadeGenerations(parentId, parentGen, db) {
  const [children] = await db.execute('SELECT id FROM members WHERE parent_id=?', [parentId]);
  for (const child of children) {
    await db.execute('UPDATE members SET generation=? WHERE id=?', [parentGen + 1, child.id]);
    await cascadeGenerations(child.id, parentGen + 1, db);
  }
}

module.exports = router;
