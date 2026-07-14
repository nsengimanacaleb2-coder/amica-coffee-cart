// Central MySQL connection pool, shared by every route file.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'amica_coffee_cart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  // Set DB_SSL=true in .env for cloud providers that require TLS (e.g. TiDB Cloud, PlanetScale)
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

module.exports = pool;
