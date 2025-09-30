const express = require('express');
const router = express.Router();

let pool;
const initializePool = (dbPool) => { pool = dbPool; };

// Health check for the router
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'financas ok' });
});

// GET /api/financas/servicos?month=2025-09
router.get('/servicos', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success:false, message:'Parâmetro month (YYYY-MM) é obrigatório' });
    }
    const start = `${month}-01`;
    const end = `${month}-01`;
    const q = `
      SELECT s.id, s.data, s.valor, c.nome AS cliente_nome,
             COALESCE(
               json_agg(
                 json_build_object(
                   'usuario_id', su.usuario_id,
                   'nome', u.nome,
                   'percentual', COALESCE(su.percentual_override, cu.percentual)
                 )
               ) FILTER (WHERE su.usuario_id IS NOT NULL), '[]'::json
             ) AS funcionarios
      FROM servicos s
      JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN servicos_usuarios su ON su.servico_id = s.id
      LEFT JOIN usuarios u ON u.id = su.usuario_id
      LEFT JOIN comissoes_usuarios cu ON cu.usuario_id = su.usuario_id
      WHERE date_trunc('month', s.data) = date_trunc('month', $1::date)
        AND s.status IN ('agendado','em_andamento','concluido')
      GROUP BY s.id, c.nome
      ORDER BY s.data ASC, s.id ASC
    `;
    const result = await pool.query(q, [start]);
    res.json({ success:true, data: result.rows });
  } catch (err) {
    console.error('Erro listando serviços do mês:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// GET /api/financas/totais-usuarios?month=2025-09
router.get('/totais-usuarios', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success:false, message:'Parâmetro month (YYYY-MM) é obrigatório' });
    }
    const q = `
      WITH servicos_mes AS (
        SELECT s.id, s.valor
        FROM servicos s
        WHERE date_trunc('month', s.data) = date_trunc('month', $1::date)
          AND s.status IN ('agendado','em_andamento','concluido')
      )
      SELECT u.id AS usuario_id, u.nome,
             COALESCE(SUM(
               sm.valor * (COALESCE(su.percentual_override, cu.percentual, 0) / 100.0)
             ), 0) AS total,
             COALESCE(MAX(cu.percentual), 0) AS percentual
      FROM usuarios u
      LEFT JOIN servicos_usuarios su ON su.usuario_id = u.id
      LEFT JOIN servicos_mes sm ON sm.id = su.servico_id
      LEFT JOIN comissoes_usuarios cu ON cu.usuario_id = u.id
  GROUP BY u.id, u.nome
      ORDER BY u.nome ASC
    `;
    const totais = (await pool.query(q, [month+'-01'])).rows;

    // Calcular pagamentos parciais feitos no mês e saldo restante
    const mov = await pool.query(
      `SELECT usuario_id, COALESCE(SUM(valor),0) AS pago
       FROM pagamentos_mov
       WHERE date_trunc('month', competencia) = date_trunc('month', $1::date)
       GROUP BY usuario_id`,
      [month+'-01']
    );
    const pagosMap = new Map(mov.rows.map(r => [String(r.usuario_id), Number(r.pago)]));
    const dataUsuarios = totais.map(t => {
      const pago = pagosMap.get(String(t.usuario_id)) || 0;
      const total = Number(t.total||0);
      const saldo = total - pago; // pode ser negativo
      return { ...t, total, pago, saldo };
    });

    // Empresa: tudo que sobrar no mês (receita - distribuído aos usuários) - despesas
    const totalMesRow = await pool.query(
      `SELECT COALESCE(SUM(valor),0) AS total_mes FROM servicos 
       WHERE date_trunc('month', data) = date_trunc('month', $1::date)
         AND status IN ('agendado','em_andamento','concluido')`,
      [month+'-01']
    );
    const totalMes = Number(totalMesRow.rows[0].total_mes || 0);
  const distribuido = dataUsuarios.reduce((acc, u) => acc + (Number(u.total)||0), 0);
  const somaPct = dataUsuarios.reduce((acc, u) => acc + (Number(u.percentual)||0), 0);
  const pctEmpresa = Math.max(0, 100 - somaPct);
    const despesasRow = await pool.query(
      `SELECT COALESCE(SUM(valor),0) AS despesas FROM despesas_financas 
       WHERE date_trunc('month', competencia) = date_trunc('month', $1::date)`,
      [month+'-01']
    );
    const despesas = Number(despesasRow.rows[0].despesas || 0);
    const empresaBruto = totalMes - distribuido;
    const empresaLiquido = empresaBruto - despesas;
    const data = [
      ...dataUsuarios,
      { usuario_id: 'empresa', nome: 'Empresa', total: empresaLiquido, pago: 0, saldo: empresaLiquido, percentual: pctEmpresa, empresa: { bruto: empresaBruto, despesas } }
    ];

    res.json({ success:true, data });
  } catch (err) {
    console.error('Erro nos totais por usuário:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// POST /api/financas/comissoes { items: [{usuario_id, percentual}] }
router.post('/comissoes', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success:false, message:'items é obrigatório' });
    }
    // Validar total de percentuais (existentes + alterações) não ultrapassa 100%
    const existing = await pool.query('SELECT usuario_id, percentual FROM comissoes_usuarios');
    const map = new Map(existing.rows.map(r => [Number(r.usuario_id), Number(r.percentual||0)]));
    for (const it of items) {
      if (!it.usuario_id || isNaN(it.usuario_id)) continue;
      const pct = Math.max(0, Math.min(100, parseFloat(it.percentual || 0)));
      map.set(Number(it.usuario_id), pct);
    }
    const totalPct = Array.from(map.values()).reduce((a,b)=> a + (Number(b)||0), 0);
    if (totalPct > 100.0001) {
      return res.status(400).json({ success:false, message:`A soma de percentuais (${totalPct.toFixed(2)}%) ultrapassa 100%. Ajuste antes de salvar.` });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const it of items) {
        if (!it.usuario_id || isNaN(it.usuario_id)) continue;
        const pct = Math.max(0, Math.min(100, parseFloat(it.percentual || 0)));
        await client.query(`
          INSERT INTO comissoes_usuarios (usuario_id, percentual, updated_at)
          VALUES ($1,$2, CURRENT_TIMESTAMP)
          ON CONFLICT (usuario_id) DO UPDATE SET percentual = EXCLUDED.percentual, updated_at = CURRENT_TIMESTAMP
        `, [it.usuario_id, pct]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ success:true });
  } catch (err) {
    console.error('Erro ao salvar comissões:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// Despesas endpoints
// GET /financas/despesas?month=YYYY-MM
router.get('/despesas', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success:false, message:'Parâmetro month (YYYY-MM) é obrigatório' });
    }
    const rows = (await pool.query(
      `SELECT id, competencia, descricao, valor, created_at
       FROM despesas_financas
       WHERE date_trunc('month', competencia) = date_trunc('month', $1::date)
       ORDER BY created_at DESC`,
      [month+'-01']
    )).rows;
    res.json({ success:true, data: rows });
  } catch (err) {
    console.error('Erro ao listar despesas:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// POST /financas/despesas { month, descricao, valor }
router.post('/despesas', async (req, res) => {
  try {
    const { month, descricao, valor } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month) || !descricao || !valor) {
      return res.status(400).json({ success:false, message:'month (YYYY-MM), descricao e valor são obrigatórios' });
    }
    const v = Number(valor);
    if (!(v > 0)) {
      return res.status(400).json({ success:false, message:'valor deve ser maior que zero' });
    }
    const row = (await pool.query(
      `INSERT INTO despesas_financas (competencia, descricao, valor) VALUES ($1::date, $2, $3) RETURNING id, competencia, descricao, valor, created_at`,
      [month+'-01', descricao, v]
    )).rows[0];
    res.json({ success:true, data: row });
  } catch (err) {
    console.error('Erro ao criar despesa:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// DELETE /financas/despesas/:id
router.delete('/despesas/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ success:false, message:'id inválido' });
    await pool.query('DELETE FROM despesas_financas WHERE id=$1', [id]);
    res.json({ success:true });
  } catch (err) {
    console.error('Erro ao remover despesa:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// POST /api/financas/pagar { usuario_id, month }
router.post('/pagar', async (req, res) => {
  try {
    const { usuario_id, month, valor } = req.body;
    if (!usuario_id || !month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success:false, message:'usuario_id e month (YYYY-MM) são obrigatórios' });
    }
    // Total devido no mês
    const qTotal = `
      WITH servicos_mes AS (
        SELECT s.id, s.valor
        FROM servicos s
        WHERE date_trunc('month', s.data) = date_trunc('month', $2::date)
          AND s.status IN ('agendado','em_andamento','concluido')
      )
      SELECT COALESCE(SUM(
        sm.valor * (COALESCE(su.percentual_override, cu.percentual, 0) / 100.0)
      ),0) AS total
      FROM servicos_usuarios su
      JOIN servicos_mes sm ON sm.id = su.servico_id
      LEFT JOIN comissoes_usuarios cu ON cu.usuario_id = su.usuario_id
      WHERE su.usuario_id = $1
    `;
    const total = Number((await pool.query(qTotal, [usuario_id, month+'-01'])).rows[0].total || 0);

    // Já pago no mês
    const pagoRow = await pool.query(
      `SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos_mov WHERE usuario_id=$1 AND date_trunc('month', competencia) = date_trunc('month', $2::date)`,
      [usuario_id, month+'-01']
    );
  const pagoAtual = Number(pagoRow.rows[0].pago || 0);
  const saldoAtual = total - pagoAtual; // pode ser negativo

    // Valor a registrar
    let valorMov;
    if (valor === undefined || valor === null || valor === '') {
      // novo comportamento: se não informado, registrar 0 (nenhuma movimentação)
      valorMov = 0;
    } else {
      // permitir pagar acima do saldo (adiantamento)
      const parsed = Number(valor);
      valorMov = isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    if (valorMov <= 0) {
      return res.json({ success:true, total, pago: pagoAtual, saldo: saldoAtual, registrado: 0 });
    }

    await pool.query(
      `INSERT INTO pagamentos_mov (usuario_id, competencia, valor, pago_em) VALUES ($1, $2::date, $3, CURRENT_TIMESTAMP)`,
      [usuario_id, month+'-01', valorMov]
    );

    // Snapshot de total na tabela pagamentos (upsert)
    await pool.query(
      `INSERT INTO pagamentos (usuario_id, competencia, valor_total, status, pago_em)
       VALUES ($1, $2::date, $3, 'pago', CURRENT_TIMESTAMP)
       ON CONFLICT (usuario_id, competencia)
       DO UPDATE SET valor_total=EXCLUDED.valor_total, pago_em=CURRENT_TIMESTAMP`,
      [usuario_id, month+'-01', total]
    );

    const novoPago = pagoAtual + valorMov;
  const novoSaldo = total - novoPago; // pode ser negativo
    res.json({ success:true, total, pago: novoPago, saldo: novoSaldo, registrado: valorMov });
  } catch (err) {
    console.error('Erro ao pagar usuário:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// GET /financas/pagamentos?usuario_id=&month=
router.get('/pagamentos', async (req, res) => {
  try {
    const { usuario_id, month } = req.query;
    if (!usuario_id || !/^\d+$/.test(String(usuario_id))) {
      return res.status(400).json({ success:false, message:'usuario_id é obrigatório' });
    }
    let filtroMes = '';
    const params = [usuario_id];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      filtroMes = ' AND date_trunc(\'month\', competencia) = date_trunc(\'month\', $2::date)';
      params.push(month+'-01');
    }
    const rows = (await pool.query(
      `SELECT id, competencia, valor, pago_em
       FROM pagamentos_mov
       WHERE usuario_id = $1${filtroMes}
       ORDER BY pago_em DESC`,
      params
    )).rows;
    res.json({ success:true, data: rows });
  } catch (err) {
    console.error('Erro ao listar movimentos de pagamento:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// PUT /financas/pagamentos/:id { valor }
router.put('/pagamentos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { valor } = req.body || {};
    const v = Number(valor);
    if (!id || isNaN(id)) return res.status(400).json({ success:false, message:'id inválido' });
    if (!(v > 0)) return res.status(400).json({ success:false, message:'valor deve ser maior que zero' });
    const row = (await pool.query(
      `UPDATE pagamentos_mov SET valor=$2 WHERE id=$1 RETURNING id, usuario_id, competencia, valor, pago_em`,
      [id, v]
    )).rows[0];
    if (!row) return res.status(404).json({ success:false, message:'Pagamento não encontrado' });
    res.json({ success:true, data: row });
  } catch (err) {
    console.error('Erro ao editar pagamento:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// DELETE /financas/pagamentos/:id
router.delete('/pagamentos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) return res.status(400).json({ success:false, message:'id inválido' });
    const result = await pool.query('DELETE FROM pagamentos_mov WHERE id=$1', [id]);
    // result.rowCount may be 0 if not found
    if ((result.rowCount || 0) === 0) return res.status(404).json({ success:false, message:'Pagamento não encontrado' });
    res.json({ success:true });
  } catch (err) {
    console.error('Erro ao remover pagamento:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// POST /financas/servicos/:id/usuarios { usuario_id }
router.post('/servicos/:id/usuarios', async (req, res) => {
  try {
    const servicoId = parseInt(req.params.id, 10);
    const { usuario_id } = req.body;
    if (!servicoId || isNaN(servicoId)) {
      return res.status(400).json({ success:false, message:'servico id inválido' });
    }
    if (!usuario_id || isNaN(usuario_id)) {
      return res.status(400).json({ success:false, message:'usuario_id inválido' });
    }
    await pool.query(
      `INSERT INTO servicos_usuarios (servico_id, usuario_id)
       VALUES ($1,$2)
       ON CONFLICT (servico_id, usuario_id) DO NOTHING`,
      [servicoId, usuario_id]
    );
    res.json({ success:true });
  } catch (err) {
    console.error('Erro ao adicionar usuário ao serviço:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

// DELETE /financas/servicos/:id/usuarios/:usuarioId
router.delete('/servicos/:id/usuarios/:usuarioId', async (req, res) => {
  try {
    const servicoId = parseInt(req.params.id, 10);
    const usuarioId = parseInt(req.params.usuarioId, 10);
    if (!servicoId || isNaN(servicoId) || !usuarioId || isNaN(usuarioId)) {
      return res.status(400).json({ success:false, message:'parâmetros inválidos' });
    }
    await pool.query('DELETE FROM servicos_usuarios WHERE servico_id = $1 AND usuario_id = $2', [servicoId, usuarioId]);
    res.json({ success:true });
  } catch (err) {
    console.error('Erro ao remover usuário do serviço:', err);
    res.status(500).json({ success:false, message:'Erro interno' });
  }
});

module.exports = { router, initializePool };
