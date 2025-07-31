# 🚀 SCRIPT DE DEPLOY - RENDER.COM
# Execute este script antes de fazer o deploy

Write-Host "🚀 PREPARANDO DEPLOY - CRM SERVICES" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Yellow

# Verificar se estamos na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na pasta raiz do projeto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Pasta raiz verificada" -ForegroundColor Green

# 1. Verificar dependências do backend
Write-Host "`n📦 Verificando dependências do backend..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependências do backend..." -ForegroundColor Yellow
    npm install
}
Write-Host "✅ Dependências do backend OK" -ForegroundColor Green

# 2. Verificar dependências do frontend
Write-Host "`n📦 Verificando dependências do frontend..." -ForegroundColor Cyan
$frontendPath = "frontend/crm-frontend"
if (-not (Test-Path "$frontendPath/node_modules")) {
    Write-Host "   Instalando dependências do frontend..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    Set-Location "../.."
}
Write-Host "✅ Dependências do frontend OK" -ForegroundColor Green

# 3. Testar build do React
Write-Host "`n🏗️ Testando build do React..." -ForegroundColor Cyan
try {
    npm run build
    Write-Host "✅ Build do React criado com sucesso" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no build do React" -ForegroundColor Red
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
    exit 1
}

# 4. Verificar estrutura do build
if (Test-Path "$frontendPath/build/index.html") {
    Write-Host "✅ Arquivo index.html encontrado no build" -ForegroundColor Green
} else {
    Write-Host "❌ Build do React incompleto" -ForegroundColor Red
    exit 1
}

# 5. Verificar arquivos de configuração
Write-Host "`n📋 Verificando configurações..." -ForegroundColor Cyan

$configFiles = @(".env.example", ".env.production", "DEPLOY-CHECKLIST.md")
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file encontrado" -ForegroundColor Green
    } else {
        Write-Host "⚠️ $file não encontrado" -ForegroundColor Yellow
    }
}

# 6. Verificar package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if ($packageJson.scripts.build -and $packageJson.scripts.postinstall) {
    Write-Host "✅ Scripts de build configurados" -ForegroundColor Green
} else {
    Write-Host "❌ Scripts de build não configurados" -ForegroundColor Red
    exit 1
}

# 7. Status do Git
Write-Host "`n📝 Status do Git..." -ForegroundColor Cyan
git status --porcelain | ForEach-Object {
    Write-Host "   $_" -ForegroundColor Gray
}

Write-Host "`n🎉 PROJETO PRONTO PARA DEPLOY!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor White
Write-Host "1. Fazer commit das mudanças:" -ForegroundColor Cyan
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Deploy: ready for production'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configurar no Render Dashboard:" -ForegroundColor Cyan
Write-Host "   - New Web Service" -ForegroundColor Gray
Write-Host "   - Connect Repository: BrunoGroehs/CRM-SERVICES" -ForegroundColor Gray
Write-Host "   - Build Command: npm install && npm run build" -ForegroundColor Gray
Write-Host "   - Start Command: npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configurar variáveis de ambiente (use .env.production)" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Atualizar Google OAuth URLs:" -ForegroundColor Cyan
Write-Host "   - https://crm-services.onrender.com" -ForegroundColor Gray
Write-Host "   - https://crm-services.onrender.com/auth/google/callback" -ForegroundColor Gray

Write-Host "`n🔥 BOA SORTE COM O DEPLOY!" -ForegroundColor Yellow
