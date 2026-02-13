#!/usr/bin/env node
// Gera recontatos 1 ano após o último serviço de cada cliente.
// Requisitos de unicidade conforme necessidade:
//  - Padrão: apenas impede duplicar MESMO cliente + MESMA data (único por dia por cliente)
//  - Se quiser impedir múltiplos recontatos em qualquer data para o mesmo cliente, use flag --unique-cliente
// Uso:
//  node scripts/gerar_recontatos_um_ano.js [--dry-run] [--hora 09:00] [--func 1] [--future-only] [--ensure-idx] [--unique-cliente]
// Flags:
//  --dry-run        : não insere; mostra contagem
//  --hora HH:MM     : hora_agendada (default 09:00)
//  --func X         : valor para funcionario_responsavel
//  --future-only    : (opcional) limita a inserir apenas datas >= hoje (por padrão INSERE também datas passadas)
//  --ensure-idx     : cria índice único (cliente_id, data_agendada)
//  --unique-cliente : força somente 1 recontato total por cliente (usa índice UNIQUE(cliente_id))

const { Pool } = require('pg');
const path = require('path');
// Carrega .env sempre a partir da raiz do projeto (um nível acima deste script)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const has = f => args.includes(f);
const get = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i+1] ? args[i+1] : d; };

const dryRun = has('--dry-run');
const horaPadrao = get('--hora','09:00');
const funcionario = get('--func', null);
const futureOnly = has('--future-only');
const ensureIdx = has('--ensure-idx');
const uniqueCliente = has('--unique-cliente');

function buildPoolConfig() {
  const directUrl = process.env.DATABASE_URL;
  if (directUrl) return { connectionString: directUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized:false } : undefined };
  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT,10):undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD !== undefined ? String(process.env.PGPASSWORD) : undefined,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized:false } : undefined
  };
}
const pool = new Pool(buildPoolConfig());

(async () => {
  const client = await pool.connect();
  try {
    if (ensureIdx) {
      if (uniqueCliente) {
        console.log('🛠️ Criando índice único por cliente (no duplicates overall)...');
        await client.query("CREATE UNIQUE INDEX IF NOT EXISTS ux_recontatos_cliente ON recontatos(cliente_id);");
      } else {
        console.log('🛠️ Criando índice único cliente+data (no duplicates same day)...');
        await client.query("CREATE UNIQUE INDEX IF NOT EXISTS ux_recontatos_cliente_data ON recontatos(cliente_id, data_agendada);");
      }
    }

    console.log('🔍 Calculando datas alvo via SQL set-based...');
  // Filtro futuro só se solicitado explicitamente (--future-only)
  const futureFilter = futureOnly ? "AND (u.ultima_data + interval '1 year')::date >= CURRENT_DATE" : '';

    // Se uniqueCliente, impedir inserção se já existe QUALQUER recontato para o cliente
    const extraNotExists = uniqueCliente ? 'AND NOT EXISTS (SELECT 1 FROM recontatos r2 WHERE r2.cliente_id = u.cliente_id)' : '';

    // Preview
    const previewSql = `WITH ultimos AS (
        SELECT cliente_id, MAX(data) AS ultima_data
        FROM servicos
        WHERE data IS NOT NULL
        GROUP BY cliente_id
      )
      SELECT u.cliente_id, (u.ultima_data + interval '1 year')::date AS data_agendada
      FROM ultimos u
      WHERE 1=1
        ${futureFilter}
        AND NOT EXISTS (
          SELECT 1 FROM recontatos r
          WHERE r.cliente_id = u.cliente_id
            AND r.data_agendada = (u.ultima_data + interval '1 year')::date
        )
        ${extraNotExists}
      ORDER BY data_agendada;`;

    const preview = await client.query(previewSql);
    console.log(`Candidatos: ${preview.rowCount}`);

  if (dryRun || preview.rowCount === 0) {
      if (preview.rowCount === 0) console.log('Nada a inserir.');
      else console.log('Dry-run: mostrando até 10 primeiros:', preview.rows.slice(0,10));
      return;
    }

    await client.query('BEGIN');
    const insertSql = `WITH ultimos AS (
        SELECT cliente_id, MAX(data) AS ultima_data
        FROM servicos
        WHERE data IS NOT NULL
        GROUP BY cliente_id
      )
      INSERT INTO recontatos (
        observacoes, data_realizado, cliente_id, funcionario_responsavel, resultado,
        data_agendada, hora_agendada, motivo, status, created_at, tipo_recontato
      )
      SELECT
        NULL, NULL, u.cliente_id, $1, NULL,
        (u.ultima_data + interval '1 year')::date AS data_agendada,
        $2::time, 'lavagem de placas', 'agendado', NOW(), 'vendas'
      FROM ultimos u
      WHERE 1=1
        ${futureFilter}
        AND NOT EXISTS (
          SELECT 1 FROM recontatos r
          WHERE r.cliente_id = u.cliente_id
            AND r.data_agendada = (u.ultima_data + interval '1 year')::date
        )
        ${extraNotExists}
      RETURNING id, cliente_id, data_agendada;`;

    const inserted = await client.query(insertSql, [funcionario, horaPadrao]);
    await client.query('COMMIT');
    console.log(`✅ Inseridos: ${inserted.rowCount}`);
    console.log('Exemplo (até 10):', inserted.rows.slice(0,10));
  } catch (e) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('❌ Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
