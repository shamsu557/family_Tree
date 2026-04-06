#!/usr/bin/env node
/**
 * hashed.js
 * Run from terminal: node hashed.js
 * Creates the superAdmin account in the database.
 * Usage: node hashed.js
 */

const readline = require('readline');
const bcrypt   = require('bcrypt');
const mysql    = require('mysql2/promise');
require('dotenv').config();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Liman Family Tree — SuperAdmin     ║');
  console.log('╚══════════════════════════════════════╝\n');

  const username = (await ask('Enter superAdmin username : ')).trim();
  const password = (await ask('Enter superAdmin password : ')).trim();

  if (!username || !password) {
    console.error('\n✖  Username and password cannot be empty.');
    rl.close(); process.exit(1);
  }
  if (password.length < 8) {
    console.error('\n✖  Password must be at least 8 characters.');
    rl.close(); process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const db = await mysql.createConnection({
   host    : process.env.DB_HOST     || 'mysql-krsms557.alwaysdata.net',
  user    : process.env.DB_USER     || 'krsms557',
  password: process.env.DB_PASSWORD || '@Krsms1440',
  database: process.env.DB_NAME     || 'krsms557_family',
  });

  // Remove any existing superadmin first
  await db.execute(`DELETE FROM admins WHERE role = 'superadmin'`);

  await db.execute(
    `INSERT INTO admins (username, password, role) VALUES (?, ?, 'superadmin')`,
    [username, hash]
  );

  console.log('\n✔  SuperAdmin created successfully!');
  console.log(`   Username : ${username}`);
  console.log('   Password : [hashed & stored]\n');

  await db.end();
  rl.close();
}

main().catch(err => {
  console.error('\n✖  Error:', err.message);
  rl.close();
  process.exit(1);
});
