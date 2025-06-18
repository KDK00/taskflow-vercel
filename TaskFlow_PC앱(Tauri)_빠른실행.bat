@echo off
chcp 65001 >nul
title TaskFlow PC 앱 빠른실행
echo.
echo ===================================
echo    TaskFlow PC 앱 빠른실행 도구
echo ===================================
echo.

:: 서버 실행 상태 확인
echo [1단계] 서버 상태 확인 중...
netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ✅ 서버가 이미 실행 중입니다 (포트 3000)
) else (
    echo ⚠️  서버가 실행되지 않음. 서버를 시작합니다...
    start /min cmd /c "npm run dev:server"
    echo ⏳ 서버 시작 대기 중... (5초)
    timeout /t 5 /nobreak >nul
)

:: 프론트엔드 서버 확인
echo [2단계] 프론트엔드 서버 상태 확인 중...
netstat -ano | findstr :5173 >nul
if %errorlevel% equ 0 (
    echo ✅ 프론트엔드 서버가 이미 실행 중입니다 (포트 5173)
) else (
    echo ⚠️  프론트엔드 서버가 실행되지 않음. 시작합니다...
    start /min cmd /c "npm run dev:client"
    echo ⏳ 프론트엔드 서버 시작 대기 중... (3초)
    timeout /t 3 /nobreak >nul
)

:: EXE 파일 존재 확인 및 실행
echo [3단계] Tauri 앱 실행 중...
if exist "src-tauri\target\debug\app.exe" (
    echo ✅ 빌드된 EXE 파일 발견! 바로 실행합니다...
    echo 🚀 TaskFlow PC 앱을 시작합니다...
    start "" "src-tauri\target\debug\app.exe"
    echo.
    echo ✅ TaskFlow PC 앱이 시작되었습니다!
    echo 💡 앱이 열리지 않으면 몇 초 더 기다려주세요.
) else (
    echo ❌ 빌드된 EXE 파일이 없습니다. 첫 번째 빌드를 시작합니다...
    echo ⏳ 이번 한 번만 컴파일합니다... (1-2분 소요)
    set PATH=%USERPROFILE%\.cargo\bin;%PATH%
    npx tauri dev
)

echo.
echo ===================================
echo 로그인 정보:
echo  관리자: admin / password123
echo  일반사용자: nara0-nara5 / password123
echo ===================================
echo.
pause 