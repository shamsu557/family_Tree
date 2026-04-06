const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host    : process.env.DB_HOST     || 'mysql-krsms557.alwaysdata.net',
  user    : process.env.DB_USER     || 'krsms557',
  password: process.env.DB_PASSWORD || '@Krsms1440',
  database: process.env.DB_NAME     || 'krsms557_family',
  waitForConnections: true,
  connectionLimit   : 10,
  charset           : 'utf8mb4',
});

module.exports = pool;
