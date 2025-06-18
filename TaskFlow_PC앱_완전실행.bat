@echo off
chcp 65001 >nul
cls

echo =======================================
echo    TaskFlow PC 앱 완전 실행 도구
echo =======================================
echo.
echo 🚀 1단계: 백엔드 서버 시작 중...
echo    잠시만 기다려주세요...
echo.

REM 기존 Node.js 프로세스 종료
taskkill /f /im node.exe >nul 2>&1

REM 백그라운드에서 서버 시작
start /B cmd /c "npm run dev:server"

echo ⏳ 서버 초기화 대기 중... (10초)
timeout /t 10 /nobreak >nul

echo.
echo 🚀 2단계: PC 앱 실행 중...
echo.

REM PC 앱 실행
if exist "src-tauri\target\debug\app.exe" (
    echo ✅ 기존 빌드 발견! PC 앱 실행...
    start "" "src-tauri\target\debug\app.exe"
    echo.
    echo 🎉 TaskFlow PC 앱이 실행되었습니다!
    echo 📌 창이 보이지 않으면 작업표시줄을 확인하세요.
    echo.
    echo 💡 사용 정보:
    echo    - 로그인: admin / admin
    echo    - 서버: http://localhost:3000
    echo.
) else (
    echo ❌ PC 앱 빌드 파일을 찾을 수 없습니다.
    echo 💡 먼저 'npm run build:tauri'를 실행해주세요.
)

echo.
echo 🔧 서버를 중지하려면 Ctrl+C를 누르세요.
pause 