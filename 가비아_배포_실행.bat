@echo off
echo ================================================
echo  🚀 TaskFlow 가비아 컨테이너 호스팅 배포 도구 v2.0
echo ================================================
echo.
echo 📋 현재 시스템 구성:
echo    🖥️  클라이언트: Tauri PC 앱
echo    🌐 도메인: 가비아 도메인 (mmsolutions.kr) ✅ 신청완료
echo    🔧 서버 ^& DB: 가비아 컨테이너 호스팅 스탠더드
echo    💰 월 운영비: 약 21,100원 (도메인 1,100원 + 호스팅 20,000원)
echo.
echo ⚠️  개선된 보안 배포 방식:
echo    🔐 환경변수는 가비아 관리툴에서만 설정
echo    🚫 .env 파일은 절대 업로드하지 않음
echo    ⚡ 효율적인 빌드 프로세스 적용

:menu
echo ================================================
echo 🎯 배포 단계를 선택하세요:
echo ================================================
echo 1. 📦 서버 프로덕션 빌드 (TypeScript → JavaScript)
echo 2. 🌐 클라이언트 프로덕션 환경 설정  
echo 3. 🖥️ Tauri PC 앱 빌드 (최종 MSI 생성)
echo 4. 📂 FTP 업로드용 파일 패키징
echo 5. 📋 가비아 배포 가이드 보기
echo 6. 🔧 현재 상태 확인
echo 7. 🧹 빌드 파일 정리
echo 0. 종료
echo ================================================
echo.

set /p choice="선택 (0-7): "

if "%choice%"=="1" goto build_server
if "%choice%"=="2" goto setup_client_env
if "%choice%"=="3" goto build_tauri
if "%choice%"=="4" goto package_files
if "%choice%"=="5" goto show_guide
if "%choice%"=="6" goto check_status
if "%choice%"=="7" goto cleanup
if "%choice%"=="0" goto end
goto menu

:build_server
echo.
echo ================================================
echo 📦 Step 1: 서버 프로덕션 빌드
echo ================================================
echo.
echo 🔧 Node.js 의존성 설치 중...
npm install
if errorlevel 1 (
    echo ❌ npm install 실패
    pause
    goto menu
)

echo.
echo 🔧 TypeScript 서버 코드 빌드 중...
npm run build:server
if errorlevel 1 (
    echo ❌ 서버 빌드 실패
    pause
    goto menu
)

echo.
echo ✅ 서버 빌드 완료!
echo 📁 빌드 결과: dist/ 폴더에 JavaScript 파일 생성됨
echo.
pause
goto menu

:setup_client_env
echo.
echo ================================================
echo 🌐 Step 2: 클라이언트 프로덕션 환경 설정
echo ================================================
echo.
echo 🔧 client/.env.production 파일 생성 중...

echo VITE_API_URL=https://mmsolutions.kr/api > client\.env.production
echo VITE_WS_URL=wss://mmsolutions.kr >> client\.env.production
echo NODE_ENV=production >> client\.env.production

echo ✅ 클라이언트 환경 설정 완료!
echo 📁 생성된 파일: client/.env.production
echo.
echo 📋 설정 내용:
echo    - API URL: https://mmsolutions.kr/api
echo    - WebSocket: wss://mmsolutions.kr
echo    - 환경: production
echo.
pause
goto menu

:build_tauri
echo.
echo ================================================
echo 🖥️ Step 3: Tauri PC 앱 빌드
echo ================================================
echo.
echo 🔧 Rust 환경 설정 중...
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

echo.
echo 🔧 클라이언트 빌드 + Tauri MSI 생성 중...
echo (이 과정은 5-10분 소요될 수 있습니다)
npm run tauri build
if errorlevel 1 (
    echo ❌ Tauri 빌드 실패
    echo 💡 Rust가 설치되지 않았거나 PATH 설정에 문제가 있을 수 있습니다.
    pause
    goto menu
)

echo.
echo ✅ Tauri PC 앱 빌드 완료!
echo 📁 MSI 설치 파일: src-tauri/target/release/bundle/msi/
echo 📁 실행 파일: src-tauri/target/release/TaskFlow.exe
echo.
pause
goto menu

:package_files
echo.
echo ================================================
echo 📂 Step 4: FTP 업로드용 파일 패키징
echo ================================================
echo.
echo 🔧 배포 폴더 준비 중...

if not exist "deploy" mkdir deploy
if not exist "deploy\server" mkdir deploy\server

echo.
echo 📁 필수 파일들 복사 중...

:: 서버 빌드 결과
if exist "dist" (
    xcopy dist deploy\server\dist /E /I /Y
    echo ✅ 서버 빌드 파일 복사 완료
) else (
    echo ❌ dist 폴더가 없습니다. 먼저 Step 1을 실행하세요.
    pause
    goto menu
)

:: 필수 설정 파일들
copy package.json deploy\server\ >nul 2>&1
copy package-lock.json deploy\server\ >nul 2>&1
echo ✅ 패키지 설정 파일 복사 완료

:: 공유 스키마
if exist "shared" (
    xcopy shared deploy\server\shared /E /I /Y
    echo ✅ 공유 스키마 복사 완료
)

:: node_modules 복사 (선택적)
echo.
echo 📦 node_modules 복사 여부를 선택하세요:
echo 1. 복사함 (권장 - 빠른 배포)
echo 2. 복사 안함 (서버에서 npm install 실행)
set /p nm_choice="선택 (1 또는 2): "

if "%nm_choice%"=="1" (
    echo 🔧 node_modules 복사 중... (시간이 많이 소요됩니다)
    xcopy node_modules deploy\server\node_modules /E /I /Y /Q
    echo ✅ node_modules 복사 완료
) else (
    echo 📝 서버에서 'npm install' 실행이 필요합니다.
)

echo.
echo ✅ FTP 업로드 파일 패키징 완료!
echo 📁 업로드할 폴더: deploy/server/
echo.
echo 📋 다음 단계:
echo 1. FileZilla 또는 WinSCP로 가비아 FTP 접속
echo 2. deploy/server/ 폴더 내용을 /home/your-id/www/에 업로드
echo 3. 가비아 관리툴에서 환경변수 설정
echo    - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
echo    - JWT_SECRET, SESSION_SECRET
echo 4. 시작 명령어: npm run start:production
echo.
pause
goto menu

:show_guide
echo.
echo ================================================
echo 📋 Step 5: 가비아 배포 가이드
echo ================================================
echo.
echo 🔐 중요: 보안 배포 절차
echo.
echo 1️⃣ 로컬 빌드 (현재 PC에서)
echo    ✅ Step 1: 서버 빌드 완료
echo    ✅ Step 2: 클라이언트 환경 설정 완료
echo    ✅ Step 3: Tauri 앱 빌드 완료
echo    ✅ Step 4: FTP 업로드 파일 준비 완료
echo.
echo 2️⃣ 가비아 서버 배포
echo    📁 FTP 업로드: deploy/server/ → /home/your-id/www/
echo    🔐 환경변수 설정 (가비아 관리툴에서만!):
echo       - NODE_ENV=production
echo       - PORT=3000
echo       - DB_HOST=[가비아 MySQL 호스트]
echo       - DB_USER=[실제 DB 사용자명]
echo       - DB_PASSWORD=[실제 DB 비밀번호]
echo       - DB_NAME=taskflow_production
echo       - JWT_SECRET=[강력한 랜덤 키]
echo       - SESSION_SECRET=[강력한 랜덤 키]
echo.
echo    ⚡ 시작 명령어: npm run start:production
echo    🔄 [재시작] 버튼 클릭
echo    📊 로그 확인
echo.
echo 3️⃣ PC 앱 배포
echo    📦 MSI 파일: src-tauri/target/release/bundle/msi/
echo    📤 직원들에게 설치 파일 배포
echo    🔗 서버 연결: https://mmsolutions.kr
echo.
echo 🚫 절대 하지 말 것:
echo    ❌ .env 파일을 서버에 업로드
echo    ❌ 비밀번호를 코드에 하드코딩
echo    ❌ HTTP 통신 (반드시 HTTPS)
echo.
pause
goto menu

:check_status
echo.
echo ================================================
echo 🔧 Step 6: 현재 상태 확인
echo ================================================
echo.
echo 📊 빌드 상태 점검:

echo.
echo 1️⃣ 서버 빌드 상태:
if exist "dist\index.js" (
    echo    ✅ dist/index.js 존재 - 서버 빌드 완료
) else (
    echo    ❌ dist/index.js 없음 - Step 1 실행 필요
)

echo.
echo 2️⃣ 클라이언트 환경 설정:
if exist "client\.env.production" (
    echo    ✅ client/.env.production 존재 - 환경 설정 완료
    echo    📋 설정 내용:
    type client\.env.production
) else (
    echo    ❌ client/.env.production 없음 - Step 2 실행 필요
)

echo.
echo 3️⃣ Tauri 빌드 상태:
if exist "src-tauri\target\release\bundle\msi" (
    echo    ✅ MSI 빌드 폴더 존재 - Tauri 빌드 완료
    dir src-tauri\target\release\bundle\msi\*.msi /B 2>nul
) else (
    echo    ❌ MSI 빌드 폴더 없음 - Step 3 실행 필요
)

echo.
echo 4️⃣ FTP 업로드 준비:
if exist "deploy\server" (
    echo    ✅ deploy/server 폴더 존재 - 패키징 완료
) else (
    echo    ❌ deploy/server 폴더 없음 - Step 4 실행 필요
)

echo.
echo 5️⃣ 네트워크 연결 테스트:
echo    🔧 mmsolutions.kr 도메인 확인 중...
ping mmsolutions.kr -n 1 >nul 2>&1
if errorlevel 1 (
    echo    ❌ 도메인 연결 실패 - DNS 설정 확인 필요
) else (
    echo    ✅ 도메인 연결 성공
)

echo.
pause
goto menu

:cleanup
echo.
echo ================================================
echo 🧹 Step 7: 빌드 파일 정리
echo ================================================
echo.
echo ⚠️  다음 폴더/파일들을 삭제합니다:
echo    📁 dist/ (서버 빌드 결과)
echo    📁 deploy/ (FTP 업로드 준비 파일)
echo    📁 src-tauri/target/ (Tauri 빌드 결과)
echo    📄 client/.env.production
echo.
set /p confirm="정말 삭제하시겠습니까? (Y/N): "
if /i "%confirm%"=="Y" (
    if exist "dist" rmdir /s /q dist
    if exist "deploy" rmdir /s /q deploy
    if exist "src-tauri\target" rmdir /s /q src-tauri\target
    if exist "client\.env.production" del client\.env.production
    echo ✅ 정리 완료!
) else (
    echo ❌ 정리 취소됨
)
echo.
pause
goto menu

:end
echo.
echo ================================================
echo 🎉 TaskFlow 가비아 배포 도구를 종료합니다.
echo ================================================
echo.
echo 📋 추가 도움이 필요하시면:
echo    📖 가비아_컨테이너_호스팅_실제배포가이드.md 참조
echo    🔧 가비아 호스팅 관리툴에서 로그 확인
echo    💬 개발팀에 문의
echo.
pause 