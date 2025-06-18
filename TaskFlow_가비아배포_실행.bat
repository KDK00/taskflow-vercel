@echo off
chcp 65001 >nul
title TaskFlow 가비아 배포 실행기
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════════════════════╗
echo ║                        TaskFlow 가비아 배포 실행기                          ║
echo ║         Tauri PC앱 + 가비아 도메인 + 가비아 컨테이너 호스팅 스탠더드        ║
echo ╚══════════════════════════════════════════════════════════════════════════════╝
echo.

echo 📋 현재 시스템 구성:
echo    🖥️  클라이언트: Tauri PC 앱
echo    🌐 도메인: 가비아 도메인 (mmsolutions.kr)
echo    🔧 서버 ^& DB: 가비아 컨테이너 호스팅 스탠더드
echo.

echo 🚀 배포 프로세스 시작...
echo ═══════════════════════════════════════════════════════════════════════════════

:MENU
echo.
echo 📌 배포 단계를 선택하세요:
echo.
echo    1. 🔧 개발 환경 준비 (Dockerfile, docker-compose.yml 생성)
echo    2. 🏗️  프로덕션 빌드 생성
echo    3. 🐳 Docker 이미지 빌드
echo    4. 📦 Tauri PC 앱 프로덕션 빌드
echo    5. 🌐 가비아 배포용 파일 패키징
echo    6. 🔍 현재 상태 확인
echo    7. 📖 가비아 배포 가이드 열기
echo    0. ❌ 종료
echo.
set /p choice=선택하세요 (0-7): 

if "%choice%"=="1" goto SETUP_DOCKER
if "%choice%"=="2" goto BUILD_PRODUCTION
if "%choice%"=="3" goto BUILD_DOCKER
if "%choice%"=="4" goto BUILD_TAURI
if "%choice%"=="5" goto PACKAGE_DEPLOY
if "%choice%"=="6" goto CHECK_STATUS
if "%choice%"=="7" goto OPEN_GUIDE
if "%choice%"=="0" goto EXIT
goto MENU

:SETUP_DOCKER
echo.
echo 🔧 1단계: 개발 환경 준비 중...
echo ─────────────────────────────────────────

REM Dockerfile 생성
echo FROM node:18-alpine > Dockerfile
echo WORKDIR /app >> Dockerfile
echo RUN apk update ^&^& apk add --no-cache sqlite python3 make g++ ^&^& rm -rf /var/cache/apk/* >> Dockerfile
echo COPY package*.json ./ >> Dockerfile
echo RUN npm ci --only=production >> Dockerfile
echo COPY . . >> Dockerfile
echo RUN mkdir -p /app/data >> Dockerfile
echo EXPOSE 3000 >> Dockerfile
echo ENV NODE_ENV=production >> Dockerfile
echo ENV PORT=3000 >> Dockerfile
echo CMD ["npm", "run", "start:production"] >> Dockerfile

echo ✅ Dockerfile 생성 완료

REM docker-compose.yml 생성
echo version: '3.8' > docker-compose.yml
echo. >> docker-compose.yml
echo services: >> docker-compose.yml
echo   taskflow-server: >> docker-compose.yml
echo     build: . >> docker-compose.yml
echo     container_name: taskflow-production >> docker-compose.yml
echo     restart: unless-stopped >> docker-compose.yml
echo     ports: >> docker-compose.yml
echo       - "3000:3000" >> docker-compose.yml
echo     environment: >> docker-compose.yml
echo       - NODE_ENV=production >> docker-compose.yml
echo       - PORT=3000 >> docker-compose.yml
echo     volumes: >> docker-compose.yml
echo       - ./data:/app/data >> docker-compose.yml
echo       - ./logs:/app/logs >> docker-compose.yml

echo ✅ docker-compose.yml 생성 완료

REM .dockerignore 생성
echo node_modules > .dockerignore
echo .git >> .dockerignore
echo .env.local >> .dockerignore
echo *.log >> .dockerignore
echo src-tauri/target >> .dockerignore
echo dist >> .dockerignore

echo ✅ .dockerignore 생성 완료

REM 프로덕션 환경 설정 디렉토리 생성
if not exist "server\config" mkdir "server\config"

echo ✅ 개발 환경 준비 완료!
pause
goto MENU

:BUILD_PRODUCTION
echo.
echo 🏗️ 2단계: 프로덕션 빌드 생성 중...
echo ─────────────────────────────────────────

REM 의존성 설치 확인
echo 📦 의존성 확인 중...
npm install

REM 클라이언트 빌드
echo 🌐 클라이언트 빌드 중...
npm run build

if %errorlevel% neq 0 (
    echo ❌ 클라이언트 빌드 실패!
    pause
    goto MENU
)

echo ✅ 프로덕션 빌드 생성 완료!
pause
goto MENU

:BUILD_DOCKER
echo.
echo 🐳 3단계: Docker 이미지 빌드 중...
echo ─────────────────────────────────────────

REM Docker 설치 확인
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker가 설치되지 않았습니다!
    echo    Docker Desktop을 설치해주세요: https://docker.com
    pause
    goto MENU
)

echo 🐳 Docker 이미지 빌드 시작...
docker build -t taskflow-server .

if %errorlevel% neq 0 (
    echo ❌ Docker 빌드 실패!
    pause
    goto MENU
)

echo ✅ Docker 이미지 빌드 완료!
echo    이미지 이름: taskflow-server

REM 빌드된 이미지 확인
echo 📋 빌드된 이미지 목록:
docker images | findstr taskflow-server

pause
goto MENU

:BUILD_TAURI
echo.
echo 📦 4단계: Tauri PC 앱 프로덕션 빌드 중...
echo ─────────────────────────────────────────

REM Rust 환경 확인
set "RUST_PATH=%USERPROFILE%\.cargo\bin"
"%RUST_PATH%\cargo.exe" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Rust가 설치되지 않았습니다!
    echo    https://rustup.rs/ 에서 Rust를 설치해주세요.
    pause
    goto MENU
)

REM PATH 설정
set "PATH=%RUST_PATH%;%PATH%"

echo 🦀 Tauri 프로덕션 빌드 시작...
echo    (최초 빌드 시 5-10분 소요될 수 있습니다)
npm run build:tauri

if %errorlevel% neq 0 (
    echo ❌ Tauri 빌드 실패!
    pause
    goto MENU
)

echo ✅ Tauri PC 앱 빌드 완료!

REM 빌드 결과 확인
if exist "src-tauri\target\release\bundle\msi" (
    echo 📦 MSI 설치 파일 생성됨:
    dir "src-tauri\target\release\bundle\msi\*.msi"
)

if exist "src-tauri\target\release\bundle\nsis" (
    echo 📦 NSIS 설치 파일 생성됨:
    dir "src-tauri\target\release\bundle\nsis\*.exe"
)

pause
goto MENU

:PACKAGE_DEPLOY
echo.
echo 🌐 5단계: 가비아 배포용 파일 패키징 중...
echo ─────────────────────────────────────────

REM 배포 디렉토리 생성
if not exist "deploy" mkdir "deploy"
if not exist "deploy\server" mkdir "deploy\server"
if not exist "deploy\client" mkdir "deploy\client"

echo 📦 서버 파일 복사 중...
xcopy /E /I /Y "server" "deploy\server\server"
copy "package.json" "deploy\server\"
copy "package-lock.json" "deploy\server\"
copy "Dockerfile" "deploy\server\"
copy "docker-compose.yml" "deploy\server\"
copy ".dockerignore" "deploy\server\"

echo 📦 클라이언트 설치 파일 복사 중...
if exist "src-tauri\target\release\bundle\msi" (
    xcopy /E /I /Y "src-tauri\target\release\bundle\msi" "deploy\client\msi"
)
if exist "src-tauri\target\release\bundle\nsis" (
    xcopy /E /I /Y "src-tauri\target\release\bundle\nsis" "deploy\client\nsis"
)

REM 배포 가이드 복사
copy "TaskFlow_가비아배포_완전가이드.md" "deploy\"

REM 배포 스크립트 생성
echo @echo off > "deploy\server\deploy.bat"
echo echo 가비아 컨테이너 호스팅 배포 스크립트 >> "deploy\server\deploy.bat"
echo docker-compose up -d >> "deploy\server\deploy.bat"
echo docker ps >> "deploy\server\deploy.bat"
echo pause >> "deploy\server\deploy.bat"

echo ✅ 가비아 배포용 파일 패키징 완료!
echo.
echo 📂 배포 파일 위치:
echo    📁 deploy\server\ - 서버 배포 파일들
echo    📁 deploy\client\ - PC 앱 설치 파일들
echo    📄 deploy\TaskFlow_가비아배포_완전가이드.md - 배포 가이드

REM 배포 폴더 열기
start explorer "deploy"

pause
goto MENU

:CHECK_STATUS
echo.
echo 🔍 6단계: 현재 상태 확인
echo ─────────────────────────────────────────

echo 📋 프로젝트 파일 확인:
if exist "package.json" (echo ✅ package.json) else (echo ❌ package.json)
if exist "Dockerfile" (echo ✅ Dockerfile) else (echo ❌ Dockerfile)
if exist "docker-compose.yml" (echo ✅ docker-compose.yml) else (echo ❌ docker-compose.yml)
if exist "src-tauri\tauri.conf.json" (echo ✅ Tauri 설정) else (echo ❌ Tauri 설정)
if exist "dist" (echo ✅ 클라이언트 빌드) else (echo ❌ 클라이언트 빌드)

echo.
echo 📋 환경 확인:
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js 설치됨
    node --version
) else (
    echo ❌ Node.js 미설치
)

docker --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker 설치됨
    docker --version
) else (
    echo ❌ Docker 미설치
)

"%USERPROFILE%\.cargo\bin\cargo.exe" --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Rust 설치됨
    "%USERPROFILE%\.cargo\bin\cargo.exe" --version
) else (
    echo ❌ Rust 미설치
)

echo.
echo 📋 빌드 결과:
if exist "src-tauri\target\release\bundle\msi" (
    echo ✅ Tauri MSI 빌드 완료
    dir "src-tauri\target\release\bundle\msi\*.msi" 2>nul
) else (
    echo ❌ Tauri MSI 빌드 필요
)

if exist "deploy" (
    echo ✅ 배포 패키지 준비됨
) else (
    echo ❌ 배포 패키지 생성 필요
)

pause
goto MENU

:OPEN_GUIDE
echo.
echo 📖 가비아 배포 가이드 열기...
if exist "TaskFlow_가비아배포_완전가이드.md" (
    start notepad "TaskFlow_가비아배포_완전가이드.md"
) else (
    echo ❌ 가이드 파일을 찾을 수 없습니다.
)
goto MENU

:EXIT
echo.
echo 👋 TaskFlow 가비아 배포 실행기를 종료합니다.
echo.
pause
exit

REM 오류 처리
:ERROR
echo ❌ 오류가 발생했습니다.
pause
goto MENU 