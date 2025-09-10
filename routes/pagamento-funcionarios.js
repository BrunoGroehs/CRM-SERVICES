const express = require('express');
const { authenticateToken, checkActiveUser, requireManagerOrAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;
const initializePool = (dbPool) => { pool = dbPool; };

router.use(authenticateToken);
router.use(checkActiveUser);

const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s||''));

// GET /pagamento-funcionarios?from&to&status
router.get('/', async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const where = [];
    const params = [];
    if (from && isValidDate(from)) { params.push(from); where.push(`(data_prevista >= $${params.length} OR data_pagamento >= $${params.length})`); }
    if (to && isValidDate(to)) { params.push(to); where.push(`(data_prevista <= $${params.length} OR data_pagamento <= $${params.length})`); }
    if (status && ['pendente','pago'].includes(status)) { params.push(status); where.push(`status = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const q = `SELECT id, servico_id, funcionario_id, valor, tipo_rateio, porcentagem, status, data_prevista, data_pagamento, metodo, valor_pago, referencia_calculo, observacoes, pagamento_history, created_at FROM pagamento_funcionarios ${whereSql} ORDER BY COALESCE(data_pagamento, data_prevista) DESC, id DESC`;
    const result = await pool.query(q, params);
    res.json({ success:true, data: result.rows, total: result.rows.length });
  } catch (e) {
    console.error('Erro GET /pagamento-funcionarios', e);
    res.status(500).json({ success:false, message: 'Erro interno' });
  }
});

// POST /pagamento-funcionarios/generate (somente admin/manager)
router.post('/generate', requireManagerOrAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { servico_id, tipo_rateio = 'igual', porcentagens, referencia_calculo = 'valor_servico', data_prevista } = req.body || {};
    if (!servico_id) return res.status(400).json({ success:false, message:'servico_id é obrigatório' });
    if (data_prevista && !isValidDate(data_prevista)) return res.status(400).json({ success:false, message:'data_prevista inválida' });

    await client.query('BEGIN');
    // Buscar serviço com usuários vinculados
  const s = await client.query(`
      SELECT s.id, s.valor,
             COALESCE(array_agg(su.usuario_id) FILTER (WHERE su.usuario_id IS NOT NULL), '{}') AS users,
             COALESCE(json_agg(json_build_object('usuario_id', su.usuario_id, 'percentual', su.percentual) ORDER BY su.usuario_id) FILTER (WHERE su.usuario_id IS NOT NULL), '[]') AS alocacoes
      FROM servicos s
      LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [servico_id]);
    if (!s.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ success:false, message:'Serviço não encontrado' }); }
    const serv = s.rows[0];
    const valorServico = parseFloat(serv.valor) || 0;
    const funcionarios = serv.users || [];
    if (!funcionarios.length) { await client.query('ROLLBACK'); return res.status(400).json({ success:false, message:'Serviço sem funcionários vinculados' }); }

  // Prevenir duplicidade: se já existem lançamentos para este serviço, retornar 409
  const exists = await client.query('SELECT 1 FROM pagamento_funcionarios WHERE servico_id = $1 LIMIT 1', [servico_id]);
  if (exists.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ success:false, message:'Pagamentos já existentes para este serviço' }); }

    const historyBase = JSON.stringify([{ at: new Date().toISOString(), action:'generated', by: (req.user?.id||null), referencia_calculo }]);
    // Carregar regras de rateio configuradas
    const rulesRes = await client.query('SELECT tipo, usuario_id, usuarios, percent FROM rateio_config');
    const rules = rulesRes.rows;
    const fixedRules = new Map(); // usuario_id => percent
    const soloRules = new Map(); // usuario_id => percent quando sozinho
    const comboRules = new Map(); // key by sorted usuarios join('-') => Map(usuario_id=>percent)
    for (const r of rules) {
      if (r.tipo === 'fixed' && r.usuario_id) fixedRules.set(String(r.usuario_id), parseFloat(r.percent) || 0);
      if (r.tipo === 'solo' && r.usuario_id) soloRules.set(String(r.usuario_id), parseFloat(r.percent) || 0);
      if (r.tipo === 'combo' && Array.isArray(r.usuarios) && r.usuarios.length) {
        const key = r.usuarios.map(x=>String(x)).sort().join('-');
        const inner = comboRules.get(key) || new Map();
        // Mesmo percent para todos do combo; pode ter múltiplas entradas por usuário
        for (const u of r.usuarios) inner.set(String(u), parseFloat(r.percent) || 0);
        comboRules.set(key, inner);
      }
    }

    // Se houver alocações com percentual definido, usar percentual por padrão
    const alocacoes = Array.isArray(serv.alocacoes) ? serv.alocacoes : [];
    const hasPercentuais = alocacoes.some(a => a && a.percentual !== null && a.percentual !== undefined);

    const usersKey = funcionarios.map(x=>String(x)).sort().join('-');
    let percByUser = {};
    // Priority: explicit porcentagens param > alocacoes salvas > combo rules > solo rules > fixed rules > equal split
    if (porcentagens && Object.keys(porcentagens).length) {
      percByUser = { ...porcentagens };
    } else if (hasPercentuais) {
      for (const a of alocacoes) if (a && a.usuario_id != null) percByUser[String(a.usuario_id)] = a.percentual;
    } else if (comboRules.has(usersKey)) {
      const map = comboRules.get(usersKey);
      for (const fid of funcionarios) percByUser[String(fid)] = map.get(String(fid)) || 0;
    } else if (funcionarios.length === 1) {
      const f0 = String(funcionarios[0]);
      percByUser[f0] = soloRules.get(f0) ?? fixedRules.get(f0) ?? 100; // se sozinho e sem regra, 100%
    } else {
      for (const fid of funcionarios) percByUser[String(fid)] = fixedRules.get(String(fid));
      const hasAll = Object.values(percByUser).every(v => v != null);
      if (!hasAll) {
        // Equal split fallback
        const eq = funcionarios.length ? (100 / funcionarios.length) : 0;
        percByUser = {};
        for (const fid of funcionarios) percByUser[String(fid)] = eq;
      }
    }
    const sumPerc = Object.values(percByUser).reduce((a,b)=> a + (parseFloat(b)||0), 0);
    if (Math.round(sumPerc) !== 100) { await client.query('ROLLBACK'); return res.status(400).json({ success:false, message:'Soma de percentuais deve ser 100%' }); }
    for (const fid of funcionarios) {
      const p = parseFloat(percByUser[String(fid)]) || 0;
      const valor = (valorServico * p) / 100;
      await client.query(`
        INSERT INTO pagamento_funcionarios (servico_id, funcionario_id, valor, tipo_rateio, porcentagem, status, data_prevista, referencia_calculo, pagamento_history)
        VALUES ($1,$2,$3,'percentual',$4,'pendente',$5,$6,$7)
      `, [servico_id, fid, valor, p, data_prevista || null, referencia_calculo, historyBase]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success:true, message:'Pagamentos gerados' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro POST /pagamento-funcionarios/generate', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  } finally {
    client.release();
  }
});

// PUT /pagamento-funcionarios/:id (somente admin/manager)
router.put('/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['status','valor_pago','data_pagamento','metodo','observacoes','porcentagem'];
    const fields = [];
    const params = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'data_pagamento' && req.body[k] && !isValidDate(req.body[k])) return res.status(400).json({ success:false, message:'data_pagamento inválida' });
        fields.push(`${k} = $${fields.length+1}`);
        params.push(req.body[k]);
      }
    }
    if (!fields.length) return res.status(400).json({ success:false, message:'Nada para atualizar' });
    params.push(id);
    const q = `UPDATE pagamento_funcionarios SET ${fields.join(', ')}, pagamento_history = COALESCE(pagamento_history, '[]'::jsonb) || $${params.length+1}::jsonb WHERE id = $${params.length} RETURNING *`;
    const historyPatch = JSON.stringify([{ at:new Date().toISOString(), action:'update', by:(req.user?.id||null), patch: req.body }]);
    params.push(historyPatch);
    const result = await pool.query(q, params);
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Pagamento não encontrado' });
    res.json({ success:true, data: result.rows[0] });
  } catch (e) {
    console.error('Erro PUT /pagamento-funcionarios/:id', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// DELETE /pagamento-funcionarios/:id (somente admin/manager)
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pagamento_funcionarios WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ success:false, message:'Pagamento não encontrado' });
    res.json({ success:true, message:'Pagamento removido' });
  } catch (e) {
    console.error('Erro DELETE /pagamento-funcionarios/:id', e);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

module.exports = { router, initializePool };
