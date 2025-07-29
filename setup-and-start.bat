@echo off
title CRM Services - Setup e Start
color 0A

echo.
echo ========================================
echo      🛠️ CRM SERVICES - DEV SETUP 🛠️
echo ========================================
echo.

set BACKEND_PATH=c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES
set FRONTEND_PATH=c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES\frontend\crm-frontend

echo 🔍 Verificando projeto...

if not exist "%BACKEND_PATH%\package.json" (
    echo ❌ package.json do backend não encontrado!
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%\package.json" (
    echo ❌ package.json do frontend não encontrado!
    pause
    exit /b 1
)

echo ✅ Estrutura verificada!
echo.

REM Verificar node_modules do backend
if not exist "%BACKEND_PATH%\node_modules" (
    echo 📦 Instalando dependências do backend...
    cd /d "%BACKEND_PATH%"
    npm install
    echo ✅ Dependências do backend instaladas!
    echo.
)

REM Verificar node_modules do frontend
if not exist "%FRONTEND_PATH%\node_modules" (
    echo 📦 Instalando dependências do frontend...
    cd /d "%FRONTEND_PATH%"
    npm install
    echo ✅ Dependências do frontend instaladas!
    echo.
)

echo 🛑 Parando processos existentes...
taskkill /f /im node.exe 2>nul
timeout /t 2 >nul

echo.
echo 🚀 Iniciando serviços...

REM Backend
echo 🔧 Backend iniciando...
start "CRM Backend" cmd /c "cd /d %BACKEND_PATH% && echo ⚡ Backend rodando em http://localhost:3000 && npm run dev"

timeout /t 5 >nul

REM Frontend  
echo 🎨 Frontend iniciando...
start "CRM Frontend" cmd /c "cd /d %FRONTEND_PATH% && echo ⚡ Frontend rodando em http://localhost:3001 && npx react-scripts start"

timeout /t 10 >nul

echo.
echo ========================================
echo            ✅ TUDO PRONTO!
echo ========================================
echo.
echo 🌐 Backend:  http://localhost:3000
echo 🎨 Frontend: http://localhost:3001
echo.
echo 🚀 Abrindo navegador...
start http://localhost:3001

echo.
echo 💡 Os serviços estão rodando em janelas separadas.
echo 🛑 Para parar tudo: execute stop-crm.bat
echo.
pause
