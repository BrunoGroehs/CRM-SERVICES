#!/usr/bin/env node
/*
  Small utility to ensure required tables exist in the current DATABASE_URL.
  - Checks for 'servicos_usuarios' and creates it if missing
  - Ensures Finanças tables/columns exist
*/
require('dotenv').config();
const { Pool } = require('pg');
const { createServicosUsuariosTable } = require('../database/servicos_usuarios');
const { createFinancasTables } = require('../database/financas');

async function tableExists(pool, table) {
  const q = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS exists;`;
  const r = await pool.query(q, [table]);
  return !!r.rows[0].exists;
}

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) {
    console.error('DATABASE_URL não definido. Crie um .env com DATABASE_URL ou exporte a variável.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    const client = await pool.connect();
    console.log('✅ Conectado ao banco:', client.database);
    client.release();

    const hasServicosUsuarios = await tableExists(pool, 'servicos_usuarios');
    console.log(`🔎 servicos_usuarios existe? ${hasServicosUsuarios}`);
    if (!hasServicosUsuarios) {
      console.log('🛠️  Criando tabela servicos_usuarios...');
      await createServicosUsuariosTable(pool);
      console.log('✅ Tabela servicos_usuarios criada.');
    }

    console.log('🛠️  Garantindo tabelas de finanças...');
    await createFinancasTables(pool);
    console.log('✅ Tabelas de finanças OK.');

    console.log('🎉 Verificação/conserto de schema concluído.');
    await pool.end();
  } catch (err) {
    console.error('❌ Erro ao corrigir schema:', err.message);
    process.exit(1);
  }
}

main();
