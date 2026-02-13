#!/usr/bin/env node
// Atualiza todos os serviços para status 'concluido'
// Uso: node scripts/update_all_servicos_concluido.js [--only-pending]
// --only-pending: atualiza apenas servicos cujo status != 'concluido'

const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const onlyPending = process.argv.includes('--only-pending');
  const pool = new Pool();
  const client = await pool.connect();
  try {
    console.log(`Iniciando atualização de status para 'concluido' (${onlyPending ? 'apenas não concluídos' : 'todos'})`);
    const where = onlyPending ? "WHERE status <> 'concluido'" : '';
    const resPreview = await client.query(`SELECT COUNT(*)::int AS total FROM servicos ${where};`);
    console.log(`Serviços a atualizar: ${resPreview.rows[0].total}`);
    if (resPreview.rows[0].total === 0) {
      console.log('Nada a fazer.');
      return;
    }
    await client.query('BEGIN');
    const updateRes = await client.query(`UPDATE servicos SET status='concluido', updated_at = NOW() ${where};`);
    await client.query('COMMIT');
    console.log(`Atualizados: ${updateRes.rowCount}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Erro na atualização:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
