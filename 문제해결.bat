@echo off
chcp 65001 > nul
title 작업관리 시스템 - 문제 해결

echo.
echo ========================================
echo    작업관리 시스템 문제 해결 도구
echo ========================================
echo.

:MENU
echo 🔧 문제 해결 메뉴:
echo.
echo 1. 포트 충돌 해결 (EADDRINUSE 오류)
echo 2. 데이터베이스 오류 해결
echo 3. 패키지 의존성 문제 해결
echo 4. 캐시 및 임시파일 정리
echo 5. 전체 환경 재설정
echo 6. 시스템 상태 확인
echo 0. 종료
echo.
set /p choice=선택하세요 (0-6): 

if "%choice%"=="1" goto PORT_FIX
if "%choice%"=="2" goto DB_FIX
if "%choice%"=="3" goto PACKAGE_FIX
if "%choice%"=="4" goto CACHE_CLEAN
if "%choice%"=="5" goto FULL_RESET
if "%choice%"=="6" goto STATUS_CHECK
if "%choice%"=="0" goto EXIT
goto MENU

:PORT_FIX
echo.
echo 🔄 포트 충돌 해결 중...
echo.
echo 포트 3000 사용 중인 프로세스:
netstat -ano | findstr :3000
echo.
echo 모든 Node.js 프로세스 종료 중...
taskkill /f /im node.exe >nul 2>&1
echo.
echo 포트 3000 사용 프로세스 강제 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo PID %%a 종료 중...
    taskkill /f /pid %%a >nul 2>&1
)
echo ✅ 포트 충돌 해결 완료
echo.
pause
goto MENU

:DB_FIX
echo.
echo 🔄 데이터베이스 문제 해결 중...
echo.
if exist "server\database.db" (
    echo 기존 데이터베이스 백업 중...
    copy "server\database.db" "server\database_backup_%date:~0,4%%date:~5,2%%date:~8,2%.db" >nul 2>&1
    echo 기존 데이터베이스 삭제 중...
    del "server\database.db" >nul 2>&1
)
if exist "server\database.db-journal" del "server\database.db-journal" >nul 2>&1
if exist "server\database.db-wal" del "server\database.db-wal" >nul 2>&1
echo ✅ 데이터베이스 문제 해결 완료
echo ℹ️  서버 재시작 시 새로운 데이터베이스가 생성됩니다
echo.
pause
goto MENU

:PACKAGE_FIX
echo.
echo 🔄 패키지 의존성 문제 해결 중...
echo.
echo node_modules 삭제 중...
if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
echo package-lock.json 삭제 중...
if exist "package-lock.json" del "package-lock.json" >nul 2>&1
echo.
echo 패키지 재설치 중...
npm install
if %errorlevel% neq 0 (
    echo ❌ 패키지 설치 실패
    echo npm cache 정리 후 재시도...
    npm cache clean --force
    npm install
)
echo.
if exist "client" (
    echo 클라이언트 패키지 확인 중...
    cd client
    if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
    if exist "package-lock.json" del "package-lock.json" >nul 2>&1
    npm install
    cd ..
)
echo ✅ 패키지 의존성 문제 해결 완료
echo.
pause
goto MENU

:CACHE_CLEAN
echo.
echo 🔄 캐시 및 임시파일 정리 중...
echo.
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" >nul 2>&1
if exist ".next" rmdir /s /q ".next" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1
if exist ".vite" rmdir /s /q ".vite" >nul 2>&1
npm cache clean --force >nul 2>&1
echo ✅ 캐시 정리 완료
echo.
pause
goto MENU

:FULL_RESET
echo.
echo ⚠️  전체 환경 재설정을 진행합니다.
echo ⚠️  모든 데이터가 삭제됩니다!
echo.
set /p confirm=계속하시겠습니까? (y/N): 
if /i not "%confirm%"=="y" goto MENU

echo.
echo 🔄 전체 환경 재설정 중...
echo.
taskkill /f /im node.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

if exist "server\database.db" del "server\database.db" >nul 2>&1
if exist "server\database.db-journal" del "server\database.db-journal" >nul 2>&1
if exist "server\database.db-wal" del "server\database.db-wal" >nul 2>&1
if exist "node_modules" rmdir /s /q "node_modules" >nul 2>&1
if exist "package-lock.json" del "package-lock.json" >nul 2>&1
if exist ".next" rmdir /s /q ".next" >nul 2>&1
if exist "dist" rmdir /s /q "dist" >nul 2>&1

npm install
echo ✅ 전체 환경 재설정 완료
echo.
pause
goto MENU

:STATUS_CHECK
echo.
echo 🔍 시스템 상태 확인 중...
echo.
echo === Node.js 버전 ===
node --version
echo.
echo === npm 버전 ===
npm --version
echo.
echo === 포트 3000 상태 ===
netstat -ano | findstr :3000
if %errorlevel% neq 0 echo 포트 3000은 사용 가능합니다
echo.
echo === 프로젝트 파일 상태 ===
if exist "package.json" (echo ✅ package.json 존재) else (echo ❌ package.json 없음)
if exist "node_modules" (echo ✅ node_modules 존재) else (echo ❌ node_modules 없음)
if exist "server" (echo ✅ server 디렉토리 존재) else (echo ❌ server 디렉토리 없음)
if exist "client" (echo ✅ client 디렉토리 존재) else (echo ❌ client 디렉토리 없음)
echo.
echo === 데이터베이스 상태 ===
if exist "server\database.db" (echo ✅ 데이터베이스 파일 존재) else (echo ℹ️  데이터베이스 파일 없음 - 서버 시작시 생성됨)
echo.
pause
goto MENU

:EXIT
echo.
echo 👋 문제 해결 도구를 종료합니다.
echo.
pause
exit 