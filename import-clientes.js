const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importClientes() {
  const clientes = [];
  let ignoredCount = 0; // Contador de clientes ignorados
  
  console.log('📁 Lendo arquivo clientes.csv...');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('./clientes.csv', { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (row) => {
        // Função para limpar caracteres problemáticos
        const cleanString = (str) => {
          if (!str) return '';
          return str
            .replace(/�/g, 'ã') // Substitui � por ã (mais comum)
            .replace(/[^\x20-\x7E\u00A0-\u017F\u0100-\u024F]/g, '') // Remove caracteres não printáveis
            .trim();
        };
        
        // Mapear os campos do CSV para a estrutura do banco
        const cliente = {
          id: parseInt(row.id) || null,
          nome: cleanString(row.nome),
          telefone: cleanString(row.telefone),
          email: row.email ? cleanString(row.email) : null,
          endereco: cleanString(row.endereco),
          cidade: cleanString(row.cidade),
          estado: row.estado || 'RS',
          cep: cleanString(row.cep),
          indicacao: cleanString(row.indicacao),
          quantidade_paineis: parseInt(row.quantidade_paineis) || 0,
          observacoes: cleanString(row.observacoes),
          status: row.status || 'ativo'
        };
        
        // Validar se o nome não está vazio e tem pelo menos 2 caracteres
        if (cliente.nome && cliente.nome.trim().length >= 2) {
          clientes.push(cliente);
        } else {
          ignoredCount++;
          console.log(`⚠️ Cliente ignorado (nome inválido): ID ${row.id}, Nome: "${row.nome}"`);
        }
      })
      .on('end', async () => {
        console.log(`📊 ${clientes.length} clientes válidos encontrados no arquivo CSV`);
        if (ignoredCount > 0) {
          console.log(`⚠️ ${ignoredCount} clientes ignorados por nome inválido`);
        }
        
        try {
          // Limpar todos os registros existentes primeiro
          console.log('🗑️ Removendo todos os clientes existentes...');
          await pool.query('DELETE FROM clientes');
          console.log('✅ Clientes existentes removidos');
          
          // Verificar se a tabela tem a coluna estado
          try {
            await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT \'RS\';');
            await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;');
            await pool.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'ativo\';');
          } catch (error) {
            console.log('Colunas já existem ou erro ao criar:', error.message);
          }
          
          let insertedCount = 0;
          let errorCount = 0;
          
          for (const cliente of clientes) {
            try {
              // Validação adicional: verificar se o nome é válido antes de inserir
              if (!cliente.nome || cliente.nome.trim().length < 2) {
                console.log(`⚠️ Cliente pulado na inserção (nome inválido): ID ${cliente.id}, Nome: "${cliente.nome}"`);
                errorCount++;
                continue;
              }
              
              // Inserir cliente (sem verificar se existe, pois deletamos tudo)
              const insertQuery = `
                INSERT INTO clientes (
                  id, nome, telefone, email, endereco, cidade, estado, cep, 
                  indicacao, quantidade_paineis, observacoes, status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `;
              
              await pool.query(insertQuery, [
                cliente.id,
                cliente.nome,
                cliente.telefone,
                cliente.email,
                cliente.endereco,
                cliente.cidade,
                cliente.estado,
                cliente.cep,
                cliente.indicacao,
                cliente.quantidade_paineis,
                cliente.observacoes,
                cliente.status
              ]);
              
              insertedCount++;
              
              // Log do progresso a cada 50 registros
              if ((insertedCount + errorCount) % 50 === 0) {
                console.log(`⏳ Processados: ${insertedCount + errorCount}/${clientes.length}`);
              }
              
            } catch (error) {
              errorCount++;
              console.error(`❌ Erro ao processar cliente ${cliente.nome}:`, error.message);
            }
          }
          
          // Resetar a sequência do ID para o próximo valor disponível
          try {
            const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM clientes');
            const maxId = maxIdResult.rows[0].max_id || 0;
            await pool.query(`SELECT setval('clientes_id_seq', ${maxId + 1}, false)`);
            console.log(`🔄 Sequência de ID resetada para ${maxId + 1}`);
          } catch (error) {
            console.log('Aviso: Não foi possível resetar a sequência:', error.message);
          }
          
          console.log('\n📈 Resultado da importação:');
          console.log(`✅ Clientes inseridos: ${insertedCount}`);
          console.log(`❌ Erros: ${errorCount}`);
          console.log(`⚠️ Ignorados (nome inválido): ${ignoredCount}`);
          console.log(`📊 Total processado: ${insertedCount + errorCount}/${clientes.length} (${ignoredCount} ignorados)`);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Executar a importação
async function main() {
  try {
    console.log('🚀 Iniciando importação de clientes...');
    await importClientes();
    console.log('✅ Importação concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Executar apenas se este arquivo for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { importClientes };
