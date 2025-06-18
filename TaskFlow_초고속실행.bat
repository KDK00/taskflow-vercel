@echo off
chcp 65001 >nul
cls

echo =======================================
echo    TaskFlow 초고속 실행 도구 v2.0
echo =======================================
echo.

:: 1. 기존 프로세스 정리 (무음)
taskkill /F /IM app.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

:: 2. 이미 빌드된 EXE 파일이 있는지 확인
if exist "src-tauri\target\debug\app.exe" (
    echo ✅ 기존 빌드 발견! 즉시 실행...
    start "" "src-tauri\target\debug\app.exe"
    echo.
    echo 🚀 TaskFlow PC 앱이 실행되었습니다!
    echo 📌 창이 보이지 않으면 작업표시줄을 확인하세요.
    timeout /t 3 >nul
    exit /b 0
)

:: 3. 빌드된 파일이 없으면 빠른 컴파일
echo ⚡ 첫 실행입니다. 빠른 컴파일을 시작합니다...
echo ⏳ 약 30-60초 소요 예정...
echo.

:: 4. 백그라운드에서 서버 시작
start /B npm run dev:server >nul 2>&1

:: 5. Tauri 개발 모드 실행
npm run dev:tauri

echo.
echo 🎉 완료! TaskFlow PC 앱이 실행 중입니다.
pause 