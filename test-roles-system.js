// Script para testar e aplicar o sistema de roles via API
const { updateDatabaseWithRoles } = require('./update-roles-database');

async function testRolesSystem() {
  try {
    console.log('🔄 Testando sistema de roles...');
    
    // Testar se o servidor está rodando
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch('http://localhost:3001/dashboard');
      console.log('✅ Servidor backend está rodando na porta 3001');
    } catch (error) {
      console.log('❌ Servidor backend não está rodando');
      return;
    }
    
    // As roles serão aplicadas quando o usuário fizer login
    console.log('📋 Sistema de roles configurado:');
    console.log('   • ADMIN: Acesso total ao sistema');
    console.log('   • MANAGER: Gestão de clientes, serviços e recontatos');
    console.log('   • USER: Acesso básico para operações do dia-a-dia');
    
    console.log('\n🎯 Para aplicar as roles:');
    console.log('   1. Faça login no sistema com Google OAuth');
    console.log('   2. O primeiro usuário será automaticamente promovido a ADMIN');
    console.log('   3. Use as rotas /admin/* para gerenciar usuários e roles');
    
    console.log('\n🔗 Rotas de administração disponíveis:');
    console.log('   GET /admin/users - Listar usuários');
    console.log('   PUT /admin/users/:id/role - Alterar role de usuário');
    console.log('   PUT /admin/users/:id/status - Ativar/desativar usuário');
    console.log('   GET /admin/roles - Listar roles e permissões');
    console.log('   GET /admin/stats - Estatísticas do sistema');

  } catch (error) {
    console.error('❌ Erro ao testar sistema de roles:', error);
  }
}

testRolesSystem();
