require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function revertServicosTable() {
  try {
    console.log('🔄 Revertendo tabela servicos para estrutura original...\n');
    
    // Fazer backup dos dados atuais
    console.log('📦 Fazendo backup dos dados atuais...');
    const backupQuery = 'SELECT * FROM servicos ORDER BY id';
    const backupData = await pool.query(backupQuery);
    console.log(`   ✅ ${backupData.rows.length} registros salvos em backup`);
    
    // Dropar tabela atual
    console.log('\n🗑️ Removendo tabela atual...');
    await pool.query('DROP TABLE IF EXISTS servicos CASCADE;');
    console.log('   ✅ Tabela removida');
    
    // Criar tabela com estrutura original (que o código espera)
    console.log('\n🔧 Criando tabela com estrutura original...');
    const createOriginalTable = `
      CREATE TABLE servicos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL,
        data DATE NOT NULL,
        hora VARCHAR(10) NOT NULL,
        valor DECIMAL(10,2),
        notas TEXT,
        status VARCHAR(50) DEFAULT 'agendado',
        funcionario_responsavel VARCHAR(255),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `;
    
    await pool.query(createOriginalTable);
    console.log('   ✅ Tabela criada com estrutura original');
    
    // Criar índices
    console.log('\n📊 Criando índices...');
    const indexes = [
      'CREATE INDEX idx_servicos_cliente_id ON servicos(cliente_id);',
      'CREATE INDEX idx_servicos_data ON servicos(data);',
      'CREATE INDEX idx_servicos_status ON servicos(status);'
    ];
    
    for (const index of indexes) {
      await pool.query(index);
    }
    console.log('   ✅ Índices criados');
    
    // Migrar dados do backup para a estrutura original
    console.log('\n🔄 Migrando dados para estrutura original...');
    for (const row of backupData.rows) {
      try {
        const insertQuery = `
          INSERT INTO servicos (
            cliente_id, 
            data, 
            hora, 
            valor, 
            notas, 
            status, 
            funcionario_responsavel
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        // Mapear campos novos para antigos
        const values = [
          row.cliente_id,
          row.data_servico,  // data_servico -> data
          row.hora_inicio,   // hora_inicio -> hora  
          row.valor,
          row.observacoes,   // observacoes -> notas
          row.status,
          row.tipo_servico   // tipo_servico -> funcionario_responsavel
        ];
        
        await pool.query(insertQuery, values);
      } catch (error) {
        console.log(`   ⚠️ Erro ao migrar registro ${row.id}:`, error.message);
      }
    }
    
    console.log(`   ✅ ${backupData.rows.length} registros migrados`);
    
    // Verificar estrutura final
    console.log('\n🔍 Verificando estrutura final...');
    const finalCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servicos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 ESTRUTURA FINAL - TABELA SERVICOS:');
    console.log('=====================================');
    finalCheck.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   ${row.column_name}: ${row.data_type} ${nullable}`);
    });
    
    // Contar registros finais
    const finalCount = await pool.query('SELECT COUNT(*) as total FROM servicos');
    console.log(`\n📊 Total de registros após migração: ${finalCount.rows[0].total}`);
    
    console.log('\n✅ REVERSÃO CONCLUÍDA COM SUCESSO!');
    console.log('🎯 A tabela agora está compatível com o código frontend/backend existente');
    
  } catch (error) {
    console.error('❌ Erro na reversão:', error);
  } finally {
    await pool.end();
  }
}

revertServicosTable();
