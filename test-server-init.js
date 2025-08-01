// Teste específico para verificar inicialização do servidor
require('dotenv').config({ path: '.env.test' });

console.log('🧪 Teste de inicialização do servidor...');
console.log('');

console.log('🔧 Variáveis de ambiente:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BASE_URL:', process.env.BASE_URL);
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('');

try {
  console.log('📦 Carregando módulos...');
  
  const express = require('express');
  console.log('✅ Express carregado');
  
  const path = require('path');
  console.log('✅ Path carregado');
  
  const cors = require('cors');
  console.log('✅ CORS carregado');
  
  const passport = require('passport');
  console.log('✅ Passport carregado');
  
  const session = require('express-session');
  console.log('✅ Express-session carregado');
  
  console.log('');
  console.log('🔧 Testando configuração do servidor...');
  
  const app = express();
  
  // Teste de configuração CORS
  const isProd = process.env.NODE_ENV === 'production';
  console.log('Ambiente de produção:', isProd);
  
  const allowedOrigins = isProd 
    ? [
        process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL || 'https://crm-services.onrender.com',
        'https://accounts.google.com'
      ]
    : [
        'http://localhost:3001', 
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
  
  console.log('CORS Origins:', allowedOrigins);
  
  // Configurar CORS
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
  }));
  
  console.log('✅ CORS configurado com sucesso');
  
  // Teste de middleware básico
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  console.log('✅ Middleware básico configurado');
  
  // Teste de rota simples
  app.get('/test', (req, res) => {
    res.json({ message: 'Teste OK', timestamp: new Date().toISOString() });
  });
  
  console.log('✅ Rota de teste configurada');
  
  // Iniciar servidor
  const port = process.env.PORT || 3001;
  const server = app.listen(port, () => {
    console.log('');
    console.log('🚀 Servidor de teste iniciado com sucesso!');
    console.log(`📡 Porta: ${port}`);
    console.log(`🌐 URL: http://localhost:${port}/test`);
    console.log('');
    console.log('✅ Teste concluído - servidor funcionando corretamente!');
    
    // Parar servidor após teste
    setTimeout(() => {
      server.close(() => {
        console.log('🛑 Servidor de teste finalizado');
        process.exit(0);
      });
    }, 2000);
  });
  
} catch (error) {
  console.error('❌ Erro durante o teste:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
