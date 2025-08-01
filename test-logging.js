// Teste do sistema de logging
console.log('🧪 Testando sistema de logging...');

// Carregar logger
const { logger, authLogger, googleLogger, dbLogger } = require('./config/logger');

console.log('📦 Loggers carregados com sucesso');

// Teste de logs básicos
logger.info('🚀 Servidor iniciado - Teste de Log', {
  environment: 'test',
  timestamp: new Date().toISOString()
});

// Teste de logs de autenticação
authLogger.info('🔐 Teste de log de autenticação', {
  userId: 'test-123',
  action: 'login_attempt'
});

// Teste de logs do Google
googleLogger.info('🔧 Teste de log do Google OAuth', {
  clientId: 'test-client-id',
  environment: 'development'
});

googleLogger.debug('🔍 Teste de debug do Google', {
  profileId: 'test-profile-123',
  email: 'test@example.com'
});

// Teste de logs de banco
dbLogger.info('🗄️ Teste de log do banco de dados', {
  operation: 'connection_test',
  status: 'success'
});

// Teste de logs de erro
logger.error('❌ Teste de log de erro', {
  error: 'Este é um erro de teste',
  stack: 'Stack trace de teste'
});

googleLogger.error('❌ Teste de erro do Google', {
  error: 'Falha na autenticação Google',
  userId: 'test-user-456'
});

console.log('✅ Teste de logging concluído!');
console.log('📁 Verifique os arquivos na pasta "logs/"');
console.log('   - logs/app.log (todos os logs)');
console.log('   - logs/error.log (apenas erros)');
console.log('   - logs/auth.log (autenticação)');
console.log('   - logs/google-auth.log (Google OAuth)');
console.log('   - logs/database.log (banco de dados)');

process.exit(0);
