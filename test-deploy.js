const path = require('path');
const express = require('express');

console.log('🧪 Testando configuração de deploy...');

// Verificar se o build existe
const buildPath = path.join(__dirname, 'frontend/crm-frontend/build');
const fs = require('fs');

try {
  const buildStats = fs.statSync(buildPath);
  console.log('✅ Diretório de build encontrado:', buildPath);
  
  const indexPath = path.join(buildPath, 'index.html');
  const indexStats = fs.statSync(indexPath);
  console.log('✅ index.html encontrado');
  
  // Listar arquivos do build
  const buildFiles = fs.readdirSync(buildPath);
  console.log('📁 Arquivos no build:', buildFiles);
  
} catch (error) {
  console.error('❌ Erro ao verificar build:', error.message);
}

// Testar variáveis de ambiente
console.log('\n🔧 Variáveis de ambiente:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Configurada' : '❌ Não configurada');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Configurada' : '❌ Não configurada');

console.log('\n✅ Teste de deploy concluído!');
