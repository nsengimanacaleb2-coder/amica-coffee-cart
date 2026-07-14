// Central MySQL connection pool, shared by every route file.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,

  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  }
});

pool.getConnection()
  .then(connection => {
    console.log("✅ Connected to Aiven MySQL");
    connection.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
  });

module.exports = pool;