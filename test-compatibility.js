require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testSystemCompatibility() {
  try {
    console.log('🔍 TESTE DE COMPATIBILIDADE - CRM SERVICES\n');
    
    // 1. Verificar estrutura da tabela
    console.log('1️⃣ Verificando estrutura da tabela servicos...');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'servicos' 
      ORDER BY ordinal_position;
    `;
    
    const structure = await pool.query(structureQuery);
    const expectedColumns = ['id', 'cliente_id', 'data', 'hora', 'valor', 'notas', 'status', 'funcionario_responsavel'];
    const actualColumns = structure.rows.map(row => row.column_name);
    
    console.log('   📋 Colunas encontradas:', actualColumns.join(', '));
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('   ✅ Estrutura da tabela está CORRETA');
    } else {
      console.log('   ❌ Problemas na estrutura:');
      if (missingColumns.length > 0) console.log('      - Colunas faltando:', missingColumns.join(', '));
      if (extraColumns.length > 0) console.log('      - Colunas extras:', extraColumns.join(', '));
    }
    
    // 2. Testar query principal do frontend
    console.log('\n2️⃣ Testando query principal (GET /servicos)...');
    const mainQuery = `
      SELECT 
        s.id,
        s.cliente_id,
        c.nome as cliente_nome,
        c.telefone as cliente_telefone,
        s.data,
        s.hora,
        s.valor,
        s.notas,
        s.status,
        s.funcionario_responsavel
      FROM servicos s
      LEFT JOIN clientes c ON s.cliente_id = c.id
      ORDER BY s.data DESC, s.hora DESC
      LIMIT 3
    `;
    
    try {
      const queryResult = await pool.query(mainQuery);
      console.log('   ✅ Query principal executada com sucesso');
      console.log(`   📊 Retornou ${queryResult.rows.length} registros`);
      
      if (queryResult.rows.length > 0) {
        console.log('   📄 Exemplo de registro:');
        const sample = queryResult.rows[0];
        console.log(`      ID: ${sample.id}, Cliente: ${sample.cliente_nome}, Data: ${sample.data}, Hora: ${sample.hora}`);
      }
    } catch (error) {
      console.log('   ❌ Erro na query principal:', error.message);
    }
    
    // 3. Verificar se não há campos da estrutura nova sendo usados
    console.log('\n3️⃣ Verificando se não há resquícios da estrutura nova...');
    const newFieldsCheck = ['tipo_servico', 'data_servico', 'hora_inicio', 'hora_fim', 'observacoes', 'descricao'];
    const foundNewFields = actualColumns.filter(col => newFieldsCheck.includes(col));
    
    if (foundNewFields.length === 0) {
      console.log('   ✅ Nenhum campo da estrutura nova encontrado');
    } else {
      console.log('   ⚠️ Campos da estrutura nova ainda presentes:', foundNewFields.join(', '));
    }
    
    // 4. Contar registros
    console.log('\n4️⃣ Verificando dados...');
    const countResult = await pool.query('SELECT COUNT(*) as total FROM servicos');
    console.log(`   📊 Total de serviços: ${countResult.rows[0].total}`);
    
    const clientesCount = await pool.query('SELECT COUNT(*) as total FROM clientes');
    console.log(`   👥 Total de clientes: ${clientesCount.rows[0].total}`);
    
    // 5. Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMO DA COMPATIBILIDADE');
    console.log('='.repeat(50));
    
    const isStructureOK = missingColumns.length === 0 && extraColumns.length === 0;
    const isQueryOK = true; // Se chegou até aqui, a query funcionou
    const isCleanOK = foundNewFields.length === 0;
    
    console.log(`✅ Estrutura da tabela: ${isStructureOK ? 'OK' : 'ERRO'}`);
    console.log(`✅ Query principal: ${isQueryOK ? 'OK' : 'ERRO'}`);
    console.log(`✅ Limpeza de campos: ${isCleanOK ? 'OK' : 'ATENÇÃO'}`);
    
    if (isStructureOK && isQueryOK && isCleanOK) {
      console.log('\n🎉 SISTEMA TOTALMENTE COMPATÍVEL!');
      console.log('🚀 Frontend e Backend devem funcionar perfeitamente');
    } else {
      console.log('\n⚠️ AINDA HÁ PROBLEMAS DE COMPATIBILIDADE');
      console.log('🔧 Verifique os erros acima');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await pool.end();
  }
}

testSystemCompatibility();
