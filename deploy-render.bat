@echo off
title Deploy Render - CRM Services
color 0A

echo.
echo ========================================
echo    🚀 PREPARANDO DEPLOY - CRM SERVICES
echo ========================================
echo.

REM Verificar se estamos na pasta correta
if not exist "package.json" (
    echo ❌ Erro: Execute este script na pasta raiz do projeto
    pause
    exit /b 1
)
echo ✅ Pasta raiz verificada

REM 1. Verificar dependências do backend
echo.
echo 📦 Verificando dependências do backend...
if not exist "node_modules" (
    echo    Instalando dependências do backend...
    npm install
)
echo ✅ Dependências do backend OK

REM 2. Verificar dependências do frontend
echo.
echo 📦 Verificando dependências do frontend...
if not exist "frontend\crm-frontend\node_modules" (
    echo    Instalando dependências do frontend...
    cd frontend\crm-frontend
    npm install
    cd ..\..
)
echo ✅ Dependências do frontend OK

REM 3. Testar build do React
echo.
echo 🏗️ Testando build do React...
npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro no build do React
    echo    Verifique os erros acima
    pause
    exit /b 1
)
echo ✅ Build do React criado com sucesso

REM 4. Verificar estrutura do build
if exist "frontend\crm-frontend\build\index.html" (
    echo ✅ Arquivo index.html encontrado no build
) else (
    echo ❌ Build do React incompleto
    pause
    exit /b 1
)

echo.
echo 🎉 PROJETO PRONTO PARA DEPLOY!
echo ================================
echo.
echo 📋 PRÓXIMOS PASSOS:
echo 1. Fazer commit das mudanças:
echo    git add .
echo    git commit -m "Deploy: ready for production"
echo    git push origin main
echo.
echo 2. Configurar no Render Dashboard:
echo    - New Web Service
echo    - Connect Repository: BrunoGroehs/CRM-SERVICES
echo    - Build Command: npm install ^&^& npm run build
echo    - Start Command: npm start
echo.
echo 3. Configurar variáveis de ambiente (use .env.production)
echo.
echo 4. Atualizar Google OAuth URLs:
echo    - https://crm-services.onrender.com
echo    - https://crm-services.onrender.com/auth/google/callback
echo.
echo 🔥 BOA SORTE COM O DEPLOY!
pause
