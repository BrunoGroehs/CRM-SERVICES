const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function criarRecontatos() {
  try {
    console.log('🚀 Iniciando criação de recontatos baseados no último serviço...');

    // Buscar o último serviço de cada cliente
    const query = `
      SELECT 
        s.cliente_id,
        c.nome as cliente_nome,
        MAX(s.data) as ultima_data_servico,
        COUNT(s.id) as total_servicos
      FROM servicos s
      INNER JOIN clientes c ON s.cliente_id = c.id
      GROUP BY s.cliente_id, c.nome
      ORDER BY s.cliente_id
    `;

    const result = await pool.query(query);
    const clientesComServicos = result.rows;

    console.log(`📊 Encontrados ${clientesComServicos.length} clientes com serviços realizados`);

    let recontatosInseridos = 0;
    let recontatosJaExistentes = 0;
    let errorCount = 0;

    for (const cliente of clientesComServicos) {
      try {
        // Calcular data do recontato (último serviço + 1 ano)
        const ultimaDataServico = new Date(cliente.ultima_data_servico);
        const dataRecontato = new Date(ultimaDataServico);
        dataRecontato.setFullYear(dataRecontato.getFullYear() + 1);

        // Verificar se já existe um recontato para este cliente na mesma data
        const recontatoExistente = await pool.query(`
          SELECT id FROM recontatos 
          WHERE cliente_id = $1 
          AND DATE(data_agendada) = DATE($2)
        `, [cliente.cliente_id, dataRecontato]);

        if (recontatoExistente.rows.length > 0) {
          console.log(`⚠️ Recontato já existe para cliente ${cliente.cliente_nome} (ID: ${cliente.cliente_id}) na data ${dataRecontato.toLocaleDateString('pt-BR')}`);
          recontatosJaExistentes++;
          continue;
        }

        // Inserir novo recontato
        const insertQuery = `
          INSERT INTO recontatos (
            cliente_id, 
            data_agendada, 
            status, 
            observacoes, 
            created_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          RETURNING id
        `;

        const insertResult = await pool.query(insertQuery, [
          cliente.cliente_id,
          dataRecontato,
          'pendente',
          'SITE NOVO'
        ]);

        recontatosInseridos++;
        
        console.log(`✅ Recontato criado para ${cliente.cliente_nome} (ID: ${cliente.cliente_id})`);
        console.log(`   Último serviço: ${ultimaDataServico.toLocaleDateString('pt-BR')}`);
        console.log(`   Recontato agendado: ${dataRecontato.toLocaleDateString('pt-BR')}`);
        console.log(`   Total de serviços: ${cliente.total_servicos}`);
        console.log('');

        // Log do progresso a cada 10 registros
        if ((recontatosInseridos + recontatosJaExistentes + errorCount) % 10 === 0) {
          console.log(`⏳ Processados: ${recontatosInseridos + recontatosJaExistentes + errorCount}/${clientesComServicos.length}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar cliente ${cliente.cliente_nome} (ID: ${cliente.cliente_id}):`, error.message);
      }
    }

    // Resetar a sequência do ID para o próximo valor disponível
    try {
      const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM recontatos');
      const maxId = maxIdResult.rows[0].max_id || 0;
      await pool.query(`SELECT setval('recontatos_id_seq', ${maxId + 1}, false)`);
      console.log(`🔄 Sequência de ID dos recontatos resetada para ${maxId + 1}`);
    } catch (error) {
      console.log('Aviso: Não foi possível resetar a sequência:', error.message);
    }

    console.log('\n📈 Resultado da criação de recontatos:');
    console.log(`✅ Recontatos inseridos: ${recontatosInseridos}`);
    console.log(`⚠️ Recontatos já existentes: ${recontatosJaExistentes}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${recontatosInseridos + recontatosJaExistentes + errorCount}/${clientesComServicos.length}`);

    // Mostrar alguns exemplos de recontatos criados
    if (recontatosInseridos > 0) {
      console.log('\n📅 Exemplos de recontatos criados:');
      const exemplosQuery = `
        SELECT 
          r.id,
          c.nome as cliente_nome,
          r.data_agendada,
          r.status,
          r.observacoes
        FROM recontatos r
        INNER JOIN clientes c ON r.cliente_id = c.id
        WHERE r.observacoes = 'SITE NOVO'
        ORDER BY r.created_at DESC
        LIMIT 5
      `;
      
      const exemplos = await pool.query(exemplosQuery);
      
      exemplos.rows.forEach((recontato, index) => {
        console.log(`${index + 1}. ${recontato.cliente_nome} - ${new Date(recontato.data_agendada).toLocaleDateString('pt-BR')} - ${recontato.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro durante a criação de recontatos:', error);
    throw error;
  }
}

// Executar a criação de recontatos
async function main() {
  try {
    await criarRecontatos();
    console.log('✅ Criação de recontatos concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Executar apenas se este arquivo for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { criarRecontatos };
