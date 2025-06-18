@echo off
echo =======================================
echo    TaskFlow PC 앱 직접 실행
echo =======================================
echo.
echo 🚀 TaskFlow PC 앱을 시작합니다...
echo.

REM 로컬 서버 먼저 시작
echo 📡 로컬 서버 시작 중...
start /B npm run dev:server

REM 3초 대기
timeout /t 3 /nobreak >nul

REM Tauri 앱 실행
echo 🖥️ PC 앱 실행 중...
start "" "src-tauri\target\debug\app.exe"

echo.
echo ✅ TaskFlow PC 앱이 실행되었습니다!
echo 📌 창이 보이지 않으면 작업표시줄을 확인하세요.
echo.
pause 