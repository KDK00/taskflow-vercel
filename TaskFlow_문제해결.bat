@echo off
chcp 65001 >nul
title TaskFlow 문제해결 도구
color 0C

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                           TaskFlow 문제해결 도구                            ║
echo ║                    (포트충돌, 프로세스충돌, DB오류 해결)                     ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

echo 🔧 문제 해결 시작...
echo ─────────────────────────────────────────

echo 1️⃣ 모든 관련 프로세스 강제 종료...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im app.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
taskkill /f /im cargo.exe >nul 2>&1
echo    ✅ 프로세스 정리 완료

echo.
echo 2️⃣ 포트 충돌 해결 (3000, 5173-5175)...
for %%p in (3000 5173 5174 5175) do (
    echo    포트 %%p 정리 중...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%p 2^>nul') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
echo    ✅ 포트 정리 완료

echo.
echo 3️⃣ 데이터베이스 완전 초기화...
if exist "taskflow.db" (
    del "taskflow.db"
    echo    ✅ taskflow.db 삭제 완료
)
if exist "app.db" (
    del "app.db"
    echo    ✅ app.db 삭제 완료
)

echo.
echo 4️⃣ Rust 환경 진단...
set "RUST_PATH=%USERPROFILE%\.cargo\bin"
if exist "%RUST_PATH%\cargo.exe" (
    echo    ✅ Rust 설치 확인됨
    "%RUST_PATH%\cargo.exe" --version
) else (
    echo    ❌ Rust가 설치되지 않음!
    echo    https://rustup.rs/ 에서 Rust를 설치하세요.
)

echo.
echo 5️⃣ Node.js 환경 진단...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Node.js 설치 확인됨
    node --version
    npm --version
) else (
    echo    ❌ Node.js가 설치되지 않음!
)

echo.
echo 6️⃣ 패키지 의존성 확인...
if exist "package.json" (
    echo    ✅ package.json 존재
    if exist "node_modules" (
        echo    ✅ node_modules 존재
    ) else (
        echo    ⚠️  node_modules 없음 - npm install 필요
    )
) else (
    echo    ❌ package.json 없음 - 잘못된 디렉토리!
)

echo.
echo 7️⃣ 네트워크 포트 상태 확인...
echo    현재 사용 중인 포트:
netstat -an | findstr ":3000\|:5173\|:5174\|:5175" 2>nul
if %errorlevel% neq 0 (
    echo    ✅ 주요 포트들이 모두 사용 가능
)

echo.
echo 8️⃣ 시스템 리소스 확인...
echo    메모리 사용량:
tasklist | findstr "node.exe\|app.exe" 2>nul
if %errorlevel% neq 0 (
    echo    ✅ TaskFlow 관련 프로세스 없음
)

echo.
echo ═══════════════════════════════════════════════════════════════════════════════
echo 🎯 문제 해결 완료!
echo ═══════════════════════════════════════════════════════════════════════════════
echo.
echo 💡 다음 단계:
echo    1. TaskFlow_PC앱_실행.bat 실행
echo    2. 또는 TaskFlow_빠른실행.bat 실행
echo.
echo 🔍 추가 문제 해결 방법:
echo    - 데이터베이스 오류: 이 파일 재실행 후 메인 실행
echo    - 포트 충돌: 시스템 재시작 후 재시도
echo    - Rust 오류: Rust 재설치 후 재시도
echo.

pause 