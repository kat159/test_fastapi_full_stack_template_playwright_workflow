# Playwright Signup Test Runner
# Usage: .\run-playwright-test.ps1 [website_url]
# Example: .\run-playwright-test.ps1 "https://denistek.online"

param(
    [string]$WebsiteUrl = "https://denistek.online"
)

Write-Host "🎭 Playwright Signup Test Runner" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if playwright is installed
if (!(Test-Path "node_modules\playwright")) {
    Write-Host "📦 Installing Playwright..." -ForegroundColor Yellow
    npm install playwright
}

# Check if chromium is installed
Write-Host "🌐 Installing Chromium browser..." -ForegroundColor Yellow
npx playwright install chromium

Write-Host ""
Write-Host "🚀 Running test against: $WebsiteUrl" -ForegroundColor Green
Write-Host ""

# Set environment variable and run test
$env:WEBSITE_URL = $WebsiteUrl
node playwright-signup-test.js

# Check if screenshot was generated
if (Test-Path "signup-failure.png") {
    Write-Host ""
    Write-Host "📸 Screenshot captured: signup-failure.png" -ForegroundColor Yellow
    $fileSize = (Get-Item "signup-failure.png").Length
    Write-Host "   File size: $([math]::Round($fileSize/1KB, 2)) KB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Test completed!" -ForegroundColor Green
