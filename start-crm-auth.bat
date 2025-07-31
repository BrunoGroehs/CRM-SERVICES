@echo off
echo.
echo ========================================
echo    🚀 INICIANDO CRM SERVICES AUTH 🚀
echo ========================================
echo.

echo 🔧 Verificando estrutura do projeto...
if not exist "server.js" (
    echo ❌ Erro: server.js não encontrado!
    echo Certifique-se de estar na pasta raiz do projeto.
    pause
    exit /b 1
)
echo ✅ Estrutura do projeto verificada!
echo.

echo 🛑 Finalizando processos Node.js existentes...
taskkill /f /im node.exe 2>nul
echo.

echo 🗄️ Iniciando Backend (Porta 3001)...
echo    Pasta: %CD%
echo    Comando: npm start
start "CRM Backend" cmd /k "npm start"
echo ⏳ Aguardando backend inicializar (8 segundos)...
timeout /t 8 /nobreak >nul
echo.

echo 🌐 Iniciando Frontend (Porta 3000)...
echo    Pasta: %CD%\frontend\crm-frontend
echo    Comando: npm start
start "CRM Frontend" cmd /k "cd /d %CD%\frontend\crm-frontend && npm start"

echo ⏳ Aguardando frontend inicializar (15 segundos)...
timeout /t 15 /nobreak >nul
echo.

echo ========================================
echo          ✅ INICIALIZAÇÃO COMPLETA
echo ========================================
echo.
echo 🔗 Backend:  http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo.
echo 🚀 Abrindo navegador...
start http://localhost:3000
echo.

echo 📋 COMANDOS ÚTEIS:
echo    Para parar: taskkill /f /im node.exe
echo    Backend:    cd "%CD%" ^&^& npm start
echo    Frontend:   cd "%CD%\frontend\crm-frontend" ^&^& npm start
echo.

echo 💡 As janelas do backend e frontend ficarão abertas.
echo    Feche este script quando terminar.
echo.
pause
