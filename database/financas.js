async function createFinancasTables(pool) {
  try {
    // Tabela de comissões padrão por usuário
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comissoes_usuarios (
        usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
        percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adiciona override de percentual por serviço/usuário
    await pool.query(`
      ALTER TABLE servicos_usuarios
      ADD COLUMN IF NOT EXISTS percentual_override NUMERIC(5,2);
    `);

    // Pagamentos mensais por usuário (competência = primeiro dia do mês)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        competencia DATE NOT NULL,
        valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pago',
        pago_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(usuario_id, competencia)
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pagamentos_competencia ON pagamentos(competencia);');

    // Movimentos de pagamentos (parciais) por usuário e competência
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagamentos_mov (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        competencia DATE NOT NULL,
        valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
        pago_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_pagmov_usuario_competencia ON pagamentos_mov(usuario_id, competencia);');

    // Despesas mensais (competência = primeiro dia do mês)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS despesas_financas (
        id SERIAL PRIMARY KEY,
        competencia DATE NOT NULL,
        descricao TEXT NOT NULL,
        valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_despesas_competencia ON despesas_financas(competencia);');

    console.log('✅ Tabelas de finanças verificadas/criadas');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas de finanças:', err.message);
    throw err;
  }
}

module.exports = { createFinancasTables };
