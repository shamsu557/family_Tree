// server.js — Liman Family Tree backend
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret           : process.env.SESSION_SECRET || 'liman_secret_change_me',
  resave           : false,
  saveUninitialized: false,
  cookie           : { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hours
}));

// ── Static files ─────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ── API Routes ────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/admins',  require('./routes/admins'));
app.use('/api/history', require('./routes/history'));

// ── Serve the SPA for all non-API routes ─────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿  Liman Family Tree running at http://localhost:${PORT}`);
  console.log(`    Run "node hashed.js" to create your superAdmin.\n`);
});
