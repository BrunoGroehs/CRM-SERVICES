# Script para inicializar Backend e Frontend do CRM Services
# Autor: Sistema CRM
# Data: $(Get-Date -Format "dd/MM/yyyy")

Write-Host "🚀 Iniciando CRM Services..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Yellow

# Definir caminhos
$backendPath = "c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES"
$frontendPath = "c:\Users\I753372\Desktop\VIBE-CODING\CRM-SERVICES\frontend\crm-frontend"

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Verificar se as portas estão livres
Write-Host "🔍 Verificando portas..." -ForegroundColor Cyan

if (Test-Port 3000) {
    Write-Host "⚠️  Porta 3000 já está em uso (Backend)" -ForegroundColor Yellow
    Write-Host "   Tentando parar processos Node.js existentes..." -ForegroundColor Gray
    try {
        Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Processos Node.js finalizados" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Não foi possível finalizar alguns processos" -ForegroundColor Yellow
    }
}

if (Test-Port 3001) {
    Write-Host "⚠️  Porta 3001 já está em uso (Frontend)" -ForegroundColor Yellow
}

# Verificar se os diretórios existem
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Diretório do backend não encontrado: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Diretório do frontend não encontrado: $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Iniciando Backend (Node.js + Express)..." -ForegroundColor Cyan
Write-Host "   Pasta: $backendPath" -ForegroundColor Gray
Write-Host "   Comando: npm run dev" -ForegroundColor Gray
Write-Host "   Porta: 3000" -ForegroundColor Gray

# Iniciar Backend em background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🚀 Backend CRM Services iniciando...' -ForegroundColor Green; npm run dev" -WindowStyle Normal

# Aguardar backend inicializar
Write-Host "⏳ Aguardando backend inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar se o backend subiu
$backendRunning = $false
for ($i = 1; $i -le 10; $i++) {
    if (Test-Port 3000) {
        $backendRunning = $true
        break
    }
    Write-Host "   Tentativa $i/10..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

if ($backendRunning) {
    Write-Host "✅ Backend rodando na porta 3000!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend não conseguiu inicializar na porta 3000" -ForegroundColor Red
    Write-Host "   Verifique os logs na janela do backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎨 Iniciando Frontend (React)..." -ForegroundColor Cyan
Write-Host "   Pasta: $frontendPath" -ForegroundColor Gray
Write-Host "   Comando: npx react-scripts start" -ForegroundColor Gray
Write-Host "   Porta: 3001" -ForegroundColor Gray

# Iniciar Frontend em background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🎨 Frontend React iniciando...' -ForegroundColor Green; npx react-scripts start" -WindowStyle Normal

# Aguardar frontend inicializar
Write-Host "⏳ Aguardando frontend inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar se o frontend subiu
$frontendRunning = $false
for ($i = 1; $i -le 15; $i++) {
    if (Test-Port 3001) {
        $frontendRunning = $true
        break
    }
    Write-Host "   Tentativa $i/15..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Yellow
Write-Host "📊 RESULTADO DA INICIALIZAÇÃO" -ForegroundColor White

if ($backendRunning) {
    Write-Host "✅ Backend: http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: Falha na inicialização" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "✅ Frontend: http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Falha na inicialização" -ForegroundColor Red
}

Write-Host ""
if ($backendRunning -and $frontendRunning) {
    Write-Host "🎉 CRM Services está rodando!" -ForegroundColor Green
    Write-Host "🌐 Acesse o sistema em: http://localhost:3001" -ForegroundColor Cyan
    
    # Abrir o navegador automaticamente
    Write-Host "🚀 Abrindo navegador..." -ForegroundColor Cyan
    Start-Process "http://localhost:3001"
} else {
    Write-Host "⚠️  Verifique os erros nas janelas do terminal" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 COMANDOS ÚTEIS:" -ForegroundColor White
Write-Host "   Para parar tudo: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
Write-Host "   Backend manual: cd '$backendPath' ; npm run dev" -ForegroundColor Gray
Write-Host "   Frontend manual: cd '$frontendPath' ; npx react-scripts start" -ForegroundColor Gray

Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
