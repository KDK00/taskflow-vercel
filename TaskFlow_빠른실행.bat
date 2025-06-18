@echo off
title TaskFlow PC앱 빠른실행
color 0B

echo ⚡ TaskFlow PC앱 빠른실행 ⚡
echo.

REM 기존 프로세스 정리
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im app.exe >nul 2>&1

REM Rust 환경 설정
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo 🚀 백엔드 서버 시작 중...
start "TaskFlow 백엔드" cmd /k "npm run dev:server"

timeout /t 8 /nobreak >nul

echo 🖥️ PC 앱 시작 중...
start "TaskFlow PC앱" cmd /k "npm run dev:tauri"

echo.
echo ✅ TaskFlow PC 앱 실행 완료!
echo    잠시 후 PC 앱 창이 열립니다.
echo.
pause 