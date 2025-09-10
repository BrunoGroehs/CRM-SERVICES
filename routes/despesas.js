const express = require('express');
const { authenticateToken, checkActiveUser, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;
const initializePool = (dbPool) => { pool = dbPool; };

// Middlewares globais
router.use(authenticateToken);
router.use(checkActiveUser);

// Util
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s||''));

// GET /despesas?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from && isValidDate(from)) { params.push(from); where.push(`data >= $${params.length}`); }
    if (to && isValidDate(to)) { params.push(to); where.push(`data <= $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, servico_id, tipo, categoria, descricao, valor, data, created_at FROM despesas ${whereSql} ORDER BY data DESC, id DESC`;
    const result = await pool.query(q, params);
    res.json({ success: true, data: result.rows, total: result.rows.length });
  } catch (e) {
    console.error('Erro GET /despesas', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// POST /despesas (somente admin/manager)
router.post('/', requireManagerOrAdmin, async (req, res) => {
  try {
    const { data, valor, categoria, tipo, descricao, servico_id } = req.body || {};
    if (!isValidDate(data)) return res.status(400).json({ success:false, message:'data inválida (YYYY-MM-DD)' });
    const v = parseFloat(valor);
    if (isNaN(v) || v < 0) return res.status(400).json({ success:false, message:'valor inválido' });
    const params = [data, v, categoria || null, tipo || null, descricao || null, servico_id || null];
    const q = `INSERT INTO despesas (data, valor, categoria, tipo, descricao, servico_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, servico_id, tipo, categoria, descricao, valor, data, created_at`;
    const result = await pool.query(q, params);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error('Erro POST /despesas', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// PUT /despesas/:id (somente admin/manager)
router.put('/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, valor, categoria, tipo, descricao, servico_id } = req.body || {};
    const fields = [];
    const params = [];
    if (data !== undefined) { if (!isValidDate(data)) return res.status(400).json({ success:false, message:'data inválida' }); fields.push(`data = $${fields.length+1}`); params.push(data); }
    if (valor !== undefined) { const v = parseFloat(valor); if (isNaN(v) || v < 0) return res.status(400).json({ success:false, message:'valor inválido' }); fields.push(`valor = $${fields.length+1}`); params.push(v); }
    if (categoria !== undefined) { fields.push(`categoria = $${fields.length+1}`); params.push(categoria || null); }
    if (tipo !== undefined) { fields.push(`tipo = $${fields.length+1}`); params.push(tipo || null); }
    if (descricao !== undefined) { fields.push(`descricao = $${fields.length+1}`); params.push(descricao || null); }
    if (servico_id !== undefined) { fields.push(`servico_id = $${fields.length+1}`); params.push(servico_id || null); }
    if (!fields.length) return res.status(400).json({ success:false, message:'Nada para atualizar' });
    params.push(id);
    const q = `UPDATE despesas SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id, servico_id, tipo, categoria, descricao, valor, data, created_at`;
    const result = await pool.query(q, params);
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Despesa não encontrada' });
    res.json({ success:true, data: result.rows[0] });
  } catch (e) {
    console.error('Erro PUT /despesas/:id', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// DELETE /despesas/:id (somente admin/manager)
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM despesas WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Despesa não encontrada' });
    res.json({ success:true, message:'Despesa removida' });
  } catch (e) {
    console.error('Erro DELETE /despesas/:id', e);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

module.exports = { router, initializePool };
