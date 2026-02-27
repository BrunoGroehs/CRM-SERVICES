require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    console.log('=== VERIFICANDO DADOS ATUAIS ===\n');
    
    const users = await pool.query('SELECT id, nome, email, role, manager_id, ativo FROM usuarios ORDER BY id');
    console.log('Usuários:');
    console.table(users.rows);
    
    const managers = users.rows.filter(u => u.role === 'manager');
    console.log(`\nManagers encontrados: ${managers.length}`);
    
    for (const manager of managers) {
      const clientCount = await pool.query('SELECT COUNT(*) as total FROM clientes WHERE manager_id = $1', [manager.id]);
      console.log(`${manager.nome} (ID: ${manager.id}) tem ${clientCount.rows[0].total} clientes`);
    }
    
    const totalClients = await pool.query('SELECT COUNT(*) as total FROM clientes');
    console.log(`\nTotal de clientes no banco: ${totalClients.rows[0].total}`);
    
    // Verificar se algum cliente não tem manager_id
    const clientsWithoutManager = await pool.query('SELECT COUNT(*) as total FROM clientes WHERE manager_id IS NULL');
    console.log(`Clientes sem manager_id: ${clientsWithoutManager.rows[0].total}`);
    
    // Verificar como estão distribuídos os clientes
    const clientDistribution = await pool.query(`
      SELECT 
        c.manager_id,
        u.nome as manager_nome,
        COUNT(*) as total_clientes
      FROM clientes c 
      LEFT JOIN usuarios u ON c.manager_id = u.id 
      GROUP BY c.manager_id, u.nome
      ORDER BY c.manager_id
    `);
    console.log('\nDistribuição de clientes por manager:');
    console.table(clientDistribution.rows);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
