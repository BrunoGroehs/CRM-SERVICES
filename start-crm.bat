@echo off
title CRM Services - Inicializador
color 0A

echo.
echo ========================================
echo    🚀 INICIANDO CRM SERVICES 🚀
echo ========================================
echo.

REM Definir caminhos
set BACKEND_PATH=c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES
set FRONTEND_PATH=c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES\frontend\crm-frontend

echo 🔍 Verificando estrutura do projeto...

REM Verificar se os diretórios existem
if not exist "%BACKEND_PATH%" (
    echo ❌ Erro: Diretório do backend não encontrado!
    echo    Caminho: %BACKEND_PATH%
    pause
    exit /b 1
)

if not exist "%FRONTEND_PATH%" (
    echo ❌ Erro: Diretório do frontend não encontrado!
    echo    Caminho: %FRONTEND_PATH%
    pause
    exit /b 1
)

echo ✅ Estrutura do projeto verificada!
echo.

REM Finalizar processos Node.js existentes
echo 🛑 Finalizando processos Node.js existentes...
taskkill /f /im node.exe 2>nul
timeout /t 2 >nul

echo.
echo 🔧 Iniciando Backend (Porta 3000)...
echo    Pasta: %BACKEND_PATH%
echo    Comando: npm run dev
echo.

REM Iniciar Backend em nova janela
start "CRM Backend - Porta 3000" cmd /c "cd /d %BACKEND_PATH% && echo 🚀 Backend CRM Services iniciando... && npm run dev && pause"

REM Aguardar backend inicializar
echo ⏳ Aguardando backend inicializar (8 segundos)...
timeout /t 8 >nul

echo.
echo 🎨 Iniciando Frontend (Porta 3001)...
echo    Pasta: %FRONTEND_PATH%
echo    Comando: npx react-scripts start
echo.

REM Iniciar Frontend em nova janela
start "CRM Frontend - Porta 3001" cmd /c "cd /d %FRONTEND_PATH% && echo 🎨 Frontend React iniciando... && npx react-scripts start && pause"

REM Aguardar frontend inicializar
echo ⏳ Aguardando frontend inicializar (15 segundos)...
timeout /t 15 >nul

echo.
echo ========================================
echo           ✅ INICIALIZAÇÃO COMPLETA
echo ========================================
echo.
echo 🌐 Backend:  http://localhost:3000
echo 🎨 Frontend: http://localhost:3001
echo.
echo 🚀 Abrindo navegador...

REM Abrir navegador
start http://localhost:3001

echo.
echo 📝 COMANDOS ÚTEIS:
echo    Para parar: taskkill /f /im node.exe
echo    Backend:    cd "%BACKEND_PATH%" ^&^& npm run dev
echo    Frontend:   cd "%FRONTEND_PATH%" ^&^& npx react-scripts start
echo.
echo 💡 As janelas do backend e frontend ficarão abertas.
echo    Feche este script quando terminar.
echo.

pause
