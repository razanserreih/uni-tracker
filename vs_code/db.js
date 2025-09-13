// attendance_backend/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',           
  database: 'project2',   // your schema
  waitForConnections: true,
  connectionLimit: 10
});

// optional: prove connection on boot
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to MySQL DB.');
  } catch (e) {
    console.error('❌ DB connection failed:', e.code, e.message);
    process.exit(1);
  }
})();

module.exports = pool;
