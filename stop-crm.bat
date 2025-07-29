@echo off
title CRM Services - Stop

echo Parando CRM Services...

REM Finalizar todos os processos Node.js
taskkill /f /im node.exe 2>nul

REM Finalizar processos React (se existirem)
taskkill /f /im node.exe 2>nul

echo CRM Services parado!
pause
