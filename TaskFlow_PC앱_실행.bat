@echo off
chcp 65001 >nul
title TaskFlow PC앱 실행기
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                           TaskFlow PC앱 실행기                              ║
echo ║                        (Cursor AI 환경 전용)                                ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

echo 🔧 1단계: 기존 프로세스 정리 중...
echo ─────────────────────────────────────────

REM Node.js 프로세스 종료
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js 프로세스 정리 완료
) else (
    echo ℹ️  실행 중인 Node.js 프로세스 없음
)

REM Tauri 앱 프로세스 종료
taskkill /f /im app.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Tauri 앱 프로세스 정리 완료
) else (
    echo ℹ️  실행 중인 Tauri 앱 없음
)

echo.
echo 🔄 2단계: 포트 충돌 해결 중...
echo ─────────────────────────────────────────

REM 포트 3000, 5173, 5174, 5175 확인 및 정리
for %%p in (3000 5173 5174 5175) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
echo ✅ 포트 정리 완료

timeout /t 2 /nobreak >nul

echo.
echo 🗃️ 3단계: 데이터베이스 초기화...
echo ─────────────────────────────────────────

REM 데이터베이스 파일 삭제 (안전한 초기화)
if exist "taskflow.db" (
    del "taskflow.db" >nul 2>&1
    echo ✅ taskflow.db 삭제 완료
)
if exist "app.db" (
    del "app.db" >nul 2>&1
    echo ✅ app.db 삭제 완료
)

echo.
echo 🦀 4단계: Rust 환경 설정...
echo ─────────────────────────────────────────

REM Rust 환경변수 설정
set "RUST_PATH=%USERPROFILE%\.cargo\bin"
set "PATH=%RUST_PATH%;%PATH%"

REM Rust 설치 확인
"%RUST_PATH%\cargo.exe" --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Rust/Cargo 환경 확인 완료
    "%RUST_PATH%\cargo.exe" --version
) else (
    echo ❌ Rust가 설치되지 않았습니다!
    echo    https://rustup.rs/ 에서 Rust를 먼저 설치해주세요.
    pause
    exit /b 1
)

echo.
echo 🚀 5단계: TaskFlow 백엔드 서버 시작...
echo ─────────────────────────────────────────

REM 백엔드 서버를 별도 창에서 실행
start "TaskFlow 백엔드 서버" cmd /k "echo 백엔드 서버 시작 중... && npm run dev:server"

echo ✅ 백엔드 서버 시작 완료 (별도 창)

echo.
echo ⏳ 6단계: 서버 초기화 대기 중...
echo ─────────────────────────────────────────

REM 백엔드 서버가 완전히 시작될 때까지 대기
echo    백엔드 서버 초기화를 위해 15초 대기...
timeout /t 15 /nobreak >nul

REM 포트 3000 확인
:CHECK_BACKEND
netstat -an | findstr ":3000" >nul 2>&1
if %errorlevel% neq 0 (
    echo    백엔드 서버를 기다리는 중... (5초 후 재확인)
    timeout /t 5 /nobreak >nul
    goto CHECK_BACKEND
)
echo ✅ 백엔드 서버 준비 완료 (포트 3000)

echo.
echo 🖥️ 7단계: TaskFlow PC 앱 시작...
echo ─────────────────────────────────────────

REM Tauri 앱을 별도 창에서 실행
start "TaskFlow PC 앱" cmd /k "echo TaskFlow PC 앱 시작 중... && echo Rust 환경: %RUST_PATH% && set PATH=%RUST_PATH%;%PATH% && npm run dev:tauri"

echo ✅ TaskFlow PC 앱 시작 완료 (별도 창)

echo.
echo ⏳ 8단계: PC 앱 컴파일 대기 중...
echo ─────────────────────────────────────────

echo    첫 실행 시 Rust 컴파일로 인해 2-5분 소요될 수 있습니다...
timeout /t 30 /nobreak >nul

echo.
echo 🎉 TaskFlow PC 앱 실행 완료!
echo ─────────────────────────────────────────
echo.
echo 📋 실행 상태:
echo    🔧 백엔드 서버: http://localhost:3000
echo    🖥️ TaskFlow PC 앱: 별도 창에서 실행 중
echo    📊 데이터베이스: 자동 초기화 완료
echo.
echo 💡 사용 방법:
echo    - TaskFlow PC 앱 창이 자동으로 열립니다
echo    - 관리자 계정: admin / admin123
echo    - 문제 발생 시 이 배치파일을 다시 실행하세요
echo.
echo 🔍 문제 해결:
echo    1. PC 앱 창이 안 열리면: Alt+Tab으로 창 찾기
echo    2. 서버 오류 시: 별도 창의 에러 메시지 확인
echo    3. 완전 초기화: 이 배치파일 재실행
echo.
echo 📝 실행 중인 창들:
echo    - "TaskFlow 백엔드 서버" (Node.js 서버)
echo    - "TaskFlow PC 앱" (Tauri 컴파일 및 실행)
echo.

REM 프로세스 상태 확인
echo 📊 현재 실행 상태 확인:
tasklist | findstr "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js 서버 실행 중
) else (
    echo ❌ Node.js 서버 실행 안됨
)

timeout /t 10 /nobreak >nul
tasklist | findstr "app.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Tauri PC 앱 실행 중
) else (
    echo ⏳ Tauri PC 앱 컴파일 중... (조금 더 기다려주세요)
)

echo.
echo ✨ 배치파일 실행 완료! ✨
echo    TaskFlow PC 앱을 사용해보세요!
echo.
pause 