const express = require('express');
const { authenticateToken, checkActiveUser, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;
const initializePool = (dbPool) => { pool = dbPool; };

router.use(authenticateToken);
router.use(checkActiveUser);

// GET all rules
router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, tipo, usuario_id, usuarios, percent, scope, created_at FROM rateio_config ORDER BY id DESC');
    res.json({ success:true, data: r.rows });
  } catch (e) {
    console.error('Erro GET /rateio-config', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// POST create rule
router.post('/', requireManagerOrAdmin, async (req, res) => {
  try {
    const { tipo, usuario_id, usuarios, percent, scope = 'global' } = req.body || {};
    if (!['fixed','solo','combo'].includes(tipo)) return res.status(400).json({ success:false, message:'tipo inválido' });
    const p = parseFloat(percent);
    if (isNaN(p) || p < 0) return res.status(400).json({ success:false, message:'percent inválido' });
    const q = `INSERT INTO rateio_config (tipo, usuario_id, usuarios, percent, scope) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const r = await pool.query(q, [tipo, usuario_id || null, Array.isArray(usuarios) ? usuarios : null, p, scope]);
    res.status(201).json({ success:true, data: r.rows[0] });
  } catch (e) {
    console.error('Erro POST /rateio-config', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// DELETE rule
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM rateio_config WHERE id = $1', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ success:false, message:'Regra não encontrada' });
    res.json({ success:true });
  } catch (e) {
    console.error('Erro DELETE /rateio-config/:id', e); res.status(500).json({ success:false, message:'Erro interno' });
  }
});

module.exports = { router, initializePool };
