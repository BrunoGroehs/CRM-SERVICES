@echo off
title CRM Services - Status Check
color 0B

echo.
echo ========================================
echo       📊 CRM SERVICES - STATUS 📊  
echo ========================================
echo.

echo 🔍 Verificando serviços...
echo.

REM Verificar processos Node.js
echo 📈 Processos Node.js ativos:
tasklist /fi "imagename eq node.exe" 2>nul | find "node.exe" >nul
if %errorlevel%==0 (
    tasklist /fi "imagename eq node.exe"
    echo.
) else (
    echo    ❌ Nenhum processo Node.js encontrado
    echo.
)

REM Verificar portas
echo 🌐 Verificando portas:

REM Porta 3000 (Backend)
netstat -an | find ":3000" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo    ✅ Porta 3000 ^(Backend^): ATIVA
) else (
    echo    ❌ Porta 3000 ^(Backend^): INATIVA
)

REM Porta 3001 (Frontend) 
netstat -an | find ":3001" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo    ✅ Porta 3001 ^(Frontend^): ATIVA
) else (
    echo    ❌ Porta 3001 ^(Frontend^): INATIVA
)

echo.

REM Testar conectividade HTTP
echo 🌍 Testando conectividade:

REM Testar Backend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '    ✅ Backend: RESPONDENDO' -ForegroundColor Green } else { Write-Host '    ⚠️  Backend: Status' $response.StatusCode -ForegroundColor Yellow } } catch { Write-Host '    ❌ Backend: NÃO RESPONDE' -ForegroundColor Red }"

REM Testar Frontend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001' -TimeoutSec 5; if ($response.StatusCode -eq 200) { Write-Host '    ✅ Frontend: RESPONDENDO' -ForegroundColor Green } else { Write-Host '    ⚠️  Frontend: Status' $response.StatusCode -ForegroundColor Yellow } } catch { Write-Host '    ❌ Frontend: NÃO RESPONDE' -ForegroundColor Red }"

echo.
echo ========================================
echo              📋 RESUMO
echo ========================================
echo.
echo 🌐 URLs dos serviços:
echo    Backend:  http://localhost:3000
echo    Frontend: http://localhost:3001
echo.
echo 🚀 Scripts disponíveis:
echo    start-simple.bat     - Iniciar serviços
echo    stop-crm.bat         - Parar serviços  
echo    setup-and-start.bat  - Setup completo
echo    status.bat           - Este status
echo.

pause
