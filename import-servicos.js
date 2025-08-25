const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importServicos() {
  const servicos = [];
  
  console.log('📁 Lendo arquivo servico1.csv...');
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('./servico3.csv', { encoding: 'utf8' })
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

        // Função para converter data de DD/MM/YYYY ou serial do Excel para YYYY-MM-DD
        const convertData = (dataStr) => {
          if (!dataStr || dataStr.trim() === '') return null;
          
          try {
            const cleanData = dataStr.trim();
            
            // Verificar se é uma data no formato DD/MM/YYYY
            if (cleanData.includes('/')) {
              const parts = cleanData.split('/');
              if (parts.length === 3) {
                const dia = parts[0].padStart(2, '0');
                const mes = parts[1].padStart(2, '0');
                const ano = parts[2];
                return `${ano}-${mes}-${dia}`;
              }
            }
            
            // Verificar se é um número serial do Excel (ex: 44571)
            const serialNumber = parseInt(cleanData);
            if (!isNaN(serialNumber) && serialNumber > 1 && serialNumber < 100000) {
              // Converter serial do Excel para data JavaScript
              // Excel conta dias desde 1º de janeiro de 1900, mas tem um bug que conta 1900 como ano bissexto
              const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
              const jsDate = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
              
              // Verificar se a data é válida
              if (!isNaN(jsDate.getTime())) {
                const year = jsDate.getFullYear();
                const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
                const day = jsDate.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
            }
            
          } catch (error) {
            console.log(`⚠️ Erro ao converter data: ${dataStr} - ${error.message}`);
          }
          
          return null;
        };

        // Função para converter valor de string para decimal
        const convertValor = (valorStr) => {
          if (!valorStr) return null;
          
          try {
            // Remove espaços, pontos (separadores de milhares) e substitui vírgula por ponto
            const cleanValue = valorStr.trim()
              .replace(/\s+/g, '') // Remove espaços
              .replace(/\./g, '') // Remove pontos (separadores de milhares)
              .replace(',', '.'); // Substitui vírgula por ponto decimal
            
            const valor = parseFloat(cleanValue);
            return isNaN(valor) ? null : valor;
          } catch (error) {
            console.log(`Erro ao converter valor: ${valorStr}`);
            return null;
          }
        };
        
        // Só processar se a data não estiver vazia
        if (row.data && row.data.trim() !== '') {
          const dataConvertida = convertData(row.data);
          
          // Log das conversões de data para debug (apenas primeiros 10 registros)
          if (servicos.length < 10 && dataConvertida) {
            console.log(`📅 Data convertida: "${row.data}" → "${dataConvertida}"`);
          }
          
          const servico = {
            id: parseInt(row.id) || null,
            cliente_id: parseInt(row.cliente_id) || null,
            data: dataConvertida,
            hora: cleanString(row.hora) || '12:00',
            valor: convertValor(row.valor),
            notas: cleanString(row.notas),
            status: cleanString(row.status) || 'concluido',
            funcionario_responsavel: cleanString(row.funcionario_responsavel)
          };
          
          // Validar se os campos obrigatórios estão preenchidos
          if (servico.cliente_id && servico.data) {
            servicos.push(servico);
          } else {
            console.log(`⚠️ Serviço ignorado (dados incompletos): ID ${row.id}, Cliente ID: ${row.cliente_id}, Data: ${row.data}`);
          }
        }
      })
      .on('end', async () => {
        console.log(`📊 ${servicos.length} serviços com data encontrados no arquivo CSV`);
        
        try {
          // Verificar se a tabela tem as colunas created_at e updated_at
          try {
            await pool.query('ALTER TABLE servicos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
            await pool.query('ALTER TABLE servicos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');
          } catch (error) {
            console.log('Colunas já existem ou erro ao criar:', error.message);
          }
          
          let insertedCount = 0;
          let updatedCount = 0;
          let errorCount = 0;
          
          for (const servico of servicos) {
            try {
              // Verificar se o cliente existe
              const clienteExists = await pool.query('SELECT id FROM clientes WHERE id = $1', [servico.cliente_id]);
              
              if (clienteExists.rows.length === 0) {
                console.log(`⚠️ Cliente ID ${servico.cliente_id} não encontrado. Serviço ID ${servico.id} ignorado.`);
                errorCount++;
                continue;
              }
              
              // Verificar se o serviço já existe pelo ID
              const existingService = await pool.query('SELECT id FROM servicos WHERE id = $1', [servico.id]);
              
              if (existingService.rows.length > 0) {
                // Atualizar serviço existente
                const updateQuery = `
                  UPDATE servicos SET 
                    cliente_id = $1, 
                    data = $2, 
                    hora = $3, 
                    valor = $4, 
                    notas = $5, 
                    status = $6, 
                    funcionario_responsavel = $7,
                    updated_at = CURRENT_TIMESTAMP
                  WHERE id = $8
                `;
                
                await pool.query(updateQuery, [
                  servico.cliente_id,
                  servico.data,
                  servico.hora,
                  servico.valor,
                  servico.notas,
                  servico.status,
                  servico.funcionario_responsavel,
                  servico.id
                ]);
                
                updatedCount++;
              } else {
                // Inserir novo serviço
                const insertQuery = `
                  INSERT INTO servicos (
                    id, cliente_id, data, hora, valor, notas, status, 
                    funcionario_responsavel, created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `;
                
                await pool.query(insertQuery, [
                  servico.id,
                  servico.cliente_id,
                  servico.data,
                  servico.hora,
                  servico.valor,
                  servico.notas,
                  servico.status,
                  servico.funcionario_responsavel
                ]);
                
                insertedCount++;
              }
              
              // Log do progresso a cada 100 registros
              if ((insertedCount + updatedCount + errorCount) % 100 === 0) {
                console.log(`⏳ Processados: ${insertedCount + updatedCount + errorCount}/${servicos.length}`);
              }
              
            } catch (error) {
              errorCount++;
              console.error(`❌ Erro ao processar serviço ID ${servico.id}:`, error.message);
            }
          }
          
          // Resetar a sequência do ID para o próximo valor disponível
          try {
            const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM servicos');
            const maxId = maxIdResult.rows[0].max_id || 0;
            await pool.query(`SELECT setval('servicos_id_seq', ${maxId + 1}, false)`);
            console.log(`🔄 Sequência de ID resetada para ${maxId + 1}`);
          } catch (error) {
            console.log('Aviso: Não foi possível resetar a sequência:', error.message);
          }
          
          console.log('\n📈 Resultado da importação:');
          console.log(`✅ Serviços inseridos: ${insertedCount}`);
          console.log(`🔄 Serviços atualizados: ${updatedCount}`);
          console.log(`❌ Erros/Ignorados: ${errorCount}`);
          console.log(`📊 Total processado: ${insertedCount + updatedCount + errorCount}/${servicos.length}`);
          
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
    console.log('🚀 Iniciando importação de serviços...');
    await importServicos();
    console.log('✅ Importação de serviços concluída com sucesso!');
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

module.exports = { importServicos };
