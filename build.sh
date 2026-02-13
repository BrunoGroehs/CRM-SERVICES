#!/bin/bash

echo "🚀 Iniciando processo de build para deploy..."

# 1. Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
npm install

# 2. Navegar para o frontend e instalar dependências
echo "📦 Instalando dependências do frontend..."
cd frontend/crm-frontend
npm install

# 3. Fazer build do React
echo "🏗️ Fazendo build do React..."
npm run build

# 4. Voltar para a raiz
cd ../..

echo "✅ Build concluído com sucesso!"
echo "📁 Frontend compilado em: frontend/crm-frontend/build"
