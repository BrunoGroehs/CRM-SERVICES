async function createRateioConfigTable(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rateio_config (
        id SERIAL PRIMARY KEY,
        tipo TEXT NOT NULL CHECK (tipo IN ('fixed','solo','combo')),
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        usuarios INTEGER[],
        percent NUMERIC NOT NULL,
        scope TEXT DEFAULT 'global',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_rateio_tipo ON rateio_config(tipo);');
  } catch (e) {
    console.error('Erro ao criar tabela rateio_config', e.message);
    throw e;
  }
}

async function ensureDefaultRateioRules(pool) {
  try {
    const usersRes = await pool.query('SELECT id, nome FROM usuarios');
    const users = usersRes.rows || [];
    const findBy = (needle) => users.find(u => (u.nome || '').toLowerCase().includes(needle));
    const bruno = findBy('bruno');
    const diego = findBy('diego');
    const manuela = findBy('manuela');

    const existingRes = await pool.query('SELECT id, tipo, usuario_id, usuarios, percent FROM rateio_config');
    const existing = existingRes.rows || [];
    const hasSolo = (uid, pct) => existing.some(r => r.tipo === 'solo' && String(r.usuario_id) === String(uid) && Number(r.percent) === Number(pct));
    const hasFixed = (uid, pct) => existing.some(r => r.tipo === 'fixed' && String(r.usuario_id) === String(uid) && Number(r.percent) === Number(pct));
    const hasCombo = (uids, pct) => {
      const sorted = uids.map(x=>String(x)).sort().join('-');
      return existing.some(r => r.tipo === 'combo' && Array.isArray(r.usuarios) && (r.usuarios.map(x=>String(x)).sort().join('-') === sorted) && Number(r.percent) === Number(pct));
    };

    // Bruno sozinho 20%
    if (bruno && !hasSolo(bruno.id, 20)) {
      await pool.query('INSERT INTO rateio_config (tipo, usuario_id, percent) VALUES ($1,$2,$3)', ['solo', bruno.id, 20]);
    }
    // Diego sozinho 20%
    if (diego && !hasSolo(diego.id, 20)) {
      await pool.query('INSERT INTO rateio_config (tipo, usuario_id, percent) VALUES ($1,$2,$3)', ['solo', diego.id, 20]);
    }
    // Bruno + Diego (cada 16%)
    if (bruno && diego && !hasCombo([bruno.id, diego.id], 16)) {
      await pool.query('INSERT INTO rateio_config (tipo, usuarios, percent) VALUES ($1,$2,$3)', ['combo', [bruno.id, diego.id], 16]);
    }
    // Manuela sempre 15%
    if (manuela && !hasFixed(manuela.id, 15)) {
      await pool.query('INSERT INTO rateio_config (tipo, usuario_id, percent) VALUES ($1,$2,$3)', ['fixed', manuela.id, 15]);
    }
  } catch (e) {
    console.warn('Aviso: falha ao aplicar regras padrão de rateio:', e.message);
  }
}

module.exports = { createRateioConfigTable, ensureDefaultRateioRules };
