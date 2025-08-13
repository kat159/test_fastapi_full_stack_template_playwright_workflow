@echo off
echo 🎭 Playwright Signup Test Runner
echo =================================
echo.

REM Set default website URL if not provided
if "%1"=="" (
    set WEBSITE_URL=https://denistek.online
) else (
    set WEBSITE_URL=%1
)

echo 🚀 Running test against: %WEBSITE_URL%
echo.

REM Install playwright if needed
if not exist "node_modules\playwright" (
    echo 📦 Installing Playwright...
    npm install playwright
)

REM Install chromium browser
echo 🌐 Installing Chromium browser...
npx playwright install chromium

REM Run the test
node playwright-signup-test.js

REM Check if screenshot was generated
if exist "signup-failure.png" (
    echo.
    echo 📸 Screenshot captured: signup-failure.png
)

echo.
echo ✅ Test completed!
pause
