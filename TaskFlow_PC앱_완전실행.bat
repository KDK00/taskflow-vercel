@echo off
chcp 65001 >nul
cls

echo ========================================
echo    TaskFlow PC 앱 완전실행 도구
echo ========================================
echo.

:: 1. 기존 프로세스 정리
echo [1단계] 기존 프로세스 정리 중...
taskkill /F /IM app.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo ✅ 프로세스 정리 완료

:: 2. 백엔드 서버 시작 (백그라운드)
echo [2단계] 백엔드 서버 시작 중...
start /B npm run dev:server
echo ✅ 백엔드 서버 시작

:: 3. 서버 시작 대기
echo [3단계] 서버 초기화 대기 중... (5초)
timeout /t 5 >nul

:: 4. PC 앱 실행
echo [4단계] TaskFlow PC 앱 실행 중...
if exist "src-tauri\target\debug\app.exe" (
    echo ✅ 빌드된 앱 발견! 실행합니다...
    start "" "src-tauri\target\debug\app.exe"
) else (
    echo ❌ 빌드된 앱이 없습니다. 첫 빌드를 시작합니다...
    npm run dev:tauri
)

echo.
echo 🎉 TaskFlow PC 앱이 실행되었습니다!
echo 📌 앱 창과 백엔드 서버가 모두 실행 중입니다.
echo 📌 종료하려면 이 창을 닫지 마세요.
echo.
pause 