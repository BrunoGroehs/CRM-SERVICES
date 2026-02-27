#!/usr/bin/env node
// Script para importar clientes e servicos a partir de CSV em UTF-8
// Uso: node scripts/import_csv.js --clientes ./clientes_NOVO.csv --servicos ./servicos_NOVO.csv
// Requisitos: Tabelas existentes conforme estrutura atual do projeto.
// Liga cada serviço aos usuários 1 e 3 na tabela servicos_usuarios.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const csv = require('csv-parser');
require('dotenv').config();

const args = process.argv.slice(2);
function getArg(name, def) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx+1]) return args[idx+1];
  return def;
}

const clientesCsv = getArg('clientes', path.join(process.cwd(), 'clientes_NOVO.csv'));
const servicosCsv = getArg('servicos', path.join(process.cwd(), 'servicos_NOVO.csv'));

if (!fs.existsSync(clientesCsv)) {
  console.error('Arquivo de clientes não encontrado:', clientesCsv);
  process.exit(1);
}
if (!fs.existsSync(servicosCsv)) {
  console.error('Arquivo de servicos não encontrado:', servicosCsv);
  process.exit(1);
}

// Monta configuração explícita (garante que password seja string)
function buildPoolConfig() {
  // Permitir DATABASE_URL ou variáveis individuais
  const urlArgIdx = args.indexOf('--db-url');
  const cliUrl = urlArgIdx !== -1 ? args[urlArgIdx + 1] : undefined;
  const directUrl = cliUrl || process.env.DATABASE_URL;
  if (directUrl) {
    return { connectionString: directUrl, ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined };
  }
  const cfg = {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD !== undefined ? String(process.env.PGPASSWORD) : undefined,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
  return cfg;
}

const poolConfig = buildPoolConfig();

// Validação mínima antes de conectar
if (!poolConfig.connectionString) {
  const missing = [];
  for (const k of ['PGHOST','PGUSER','PGPASSWORD','PGDATABASE']) {
    if (!process.env[k]) missing.push(k);
  }
  if (missing.length) {
    console.error('❌ Variáveis de ambiente ausentes:', missing.join(', '));
    console.error('Defina no .env ou passe --db-url postgres://user:pass@host:port/db');
  }
  if (poolConfig.password !== undefined && typeof poolConfig.password !== 'string') {
    console.error('❌ Senha não pôde ser convertida para string. Valor:', poolConfig.password);
    process.exit(1);
  }
}

console.log('🔌 Config DB (sanitizada):', {
  host: poolConfig.host || '(via URL)',
  user: poolConfig.user && poolConfig.user.slice(0,2) + '***',
  database: poolConfig.database,
  ssl: !!poolConfig.ssl
});

const pool = new Pool(poolConfig);

async function importClientes() {
  console.log('Iniciando importação de clientes a partir de', clientesCsv);
  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(clientesCsv, { encoding: 'utf8' })
      .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }))
      .on('data', (data) => rows.push(data))
      .on('error', reject)
      .on('end', async () => {
        console.log(`Total de linhas de clientes lidas (incluindo cabeçalho): ${rows.length}`);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const r of rows) {
            // Campos do CSV: id,nome,observacoes,telefone,endereco,cidade,quantidade_paineis,estado,cep,indicacao,created_at,status,updated_at,email
            if (!r.id || !r.nome) continue; // pular linhas vazias

            // Verificar se já existe pelo id ou nome+telefone
            const exists = await client.query('SELECT id FROM clientes WHERE id = $1', [r.id]);
            if (exists.rowCount > 0) {
              console.log(`Cliente id ${r.id} já existe - pulando`);
              continue;
            }

            // Inserir mantendo o id (necessário set sequence depois)
            await client.query(`
              INSERT INTO clientes (id, nome, telefone, email, endereco, cidade, cep, indicacao, created_at, updated_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9, CURRENT_TIMESTAMP), COALESCE($10, CURRENT_TIMESTAMP))
              ON CONFLICT (id) DO NOTHING;
            `, [
              r.id,
              r.nome?.trim() || 'Sem Nome',
              r.telefone?.trim() || '0000000000',
              r.email?.trim() || null,
              r.endereco || null,
              r.cidade || null,
              r.cep || null,
              r.indicacao || null,
              r.created_at || null,
              r.updated_at || null
            ]);

            // Atualizar campos extras se existirem
            if (r.quantidade_paineis) {
              await client.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS quantidade_paineis INTEGER DEFAULT 0;');
              await client.query('UPDATE clientes SET quantidade_paineis = $1 WHERE id = $2', [parseInt(r.quantidade_paineis,10)||0, r.id]);
            }
            if (r.observacoes) {
              await client.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;');
              await client.query('UPDATE clientes SET observacoes = $1 WHERE id = $2', [r.observacoes, r.id]);
            }
            if (r.estado) {
              await client.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado VARCHAR(10);');
              await client.query('UPDATE clientes SET estado = $1 WHERE id = $2', [r.estado, r.id]);
            }
            if (r.status) {
              await client.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT ' + "'ativo'" + ';');
              await client.query('UPDATE clientes SET status = $1 WHERE id = $2', [r.status, r.id]);
            }
          }

          // Ajustar sequência para o próximo id
          await client.query("SELECT setval(pg_get_serial_sequence('clientes','id'), (SELECT MAX(id) FROM clientes));");
          await client.query('COMMIT');
          console.log('Importação de clientes concluída.');
          resolve();
        } catch (e) {
          await client.query('ROLLBACK');
          reject(e);
        } finally {
          client.release();
        }
      });
  });
}

async function importServicos() {
  console.log('Iniciando importação de servicos a partir de', servicosCsv);
  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(servicosCsv, { encoding: 'utf8' })
      .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim() }))
      .on('data', (data) => rows.push(data))
      .on('error', reject)
      .on('end', async () => {
        console.log(`Total de linhas de servicos lidas (incluindo cabeçalho): ${rows.length}`);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const r of rows) {
            // Campos: id_cliente,Servicos,Data,hora
            if (!r.id_cliente || !r.Servicos) continue;
            const clienteId = parseInt(r.id_cliente, 10);
            if (isNaN(clienteId)) continue;

            // Valor pode ser zero (permitir)
            const valor = parseFloat(r.Servicos);
            const data = r.Data; // yyyy-mm-dd
            const hora = r.hora;

            // Verificar existência do cliente
            const clienteExists = await client.query('SELECT id FROM clientes WHERE id = $1', [clienteId]);
            if (clienteExists.rowCount === 0) {
              console.warn(`Cliente ${clienteId} não encontrado para serviço - pulando linha.`);
              continue;
            }

            // Inserir serviço
            const insertServico = await client.query(`
              INSERT INTO servicos (cliente_id, data, hora, valor)
              VALUES ($1,$2,$3,$4)
              RETURNING id;
            `, [clienteId, data, hora, isNaN(valor) ? null : valor]);
            const servicoId = insertServico.rows[0].id;

            // Relacionar usuários 1 e 3
            for (const usuarioId of [1,3]) {
              try {
                await client.query(`
                  INSERT INTO servicos_usuarios (servico_id, usuario_id)
                  VALUES ($1,$2) ON CONFLICT DO NOTHING;
                `, [servicoId, usuarioId]);
              } catch (relErr) {
                console.warn(`Falha ao relacionar usuario ${usuarioId} ao servico ${servicoId}:`, relErr.message);
              }
            }
          }

          await client.query('COMMIT');
          console.log('Importação de serviços concluída.');
          resolve();
        } catch (e) {
          await client.query('ROLLBACK');
          reject(e);
        } finally {
          client.release();
        }
      });
  });
}

(async () => {
  try {
    console.time('tempo_total');
    await importClientes();
    await importServicos();
    console.timeEnd('tempo_total');
    console.log('✅ Processo finalizado com sucesso.');
  } catch (err) {
    console.error('❌ Erro geral na importação:', err);
  } finally {
    await pool.end();
  }
})();
