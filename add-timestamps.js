const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addTimestamps() {
  try {
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
    console.log('✅ created_at adicionado');
    await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
    console.log('✅ updated_at adicionado');
  } catch (err) {
    console.log('⚠️', err.message);
  } finally {
    await pool.end();
  }
}

addTimestamps();
