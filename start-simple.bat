@echo off
title CRM Services - Start

REM Matar processos Node existentes
taskkill /f /im node.exe 2>nul

echo Iniciando CRM Services...

REM Backend
start "Backend" cmd /c "cd /d c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES && npm run dev"

REM Aguardar 5 segundos
timeout /t 5 >nul

REM Frontend
start "Frontend" cmd /c "cd /d c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES\frontend\crm-frontend && npx react-scripts start"

REM Aguardar 10 segundos e abrir navegador
timeout /t 10 >nul
start http://localhost:3001

echo CRM Services iniciado!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3001
