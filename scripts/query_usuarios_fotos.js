const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const r = await pool.query('SELECT id, email, nome, COALESCE(foto_perfil, \'<null>\') AS foto_perfil FROM usuarios ORDER BY id LIMIT 50');
    console.table(r.rows);
    process.exit(0);
  } catch (e) {
    console.error('Erro consultando usuarios:', e.message);
    process.exit(1);
  }
})();
