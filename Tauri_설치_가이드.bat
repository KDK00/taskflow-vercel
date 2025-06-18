@echo off
echo =======================================
echo    TaskFlow Tauri 설치 가이드
echo =======================================
echo.
echo 1. Rust 설치 중...
echo    https://rustup.rs/ 에서 다운로드 중...
powershell -Command "Start-Process 'https://rustup.rs/'"

echo.
echo 2. 설치 완료 후 터미널을 다시 열어주세요
echo.
echo 3. 설치 확인 명령어:
echo    rustc --version
echo    cargo --version
echo.
echo 4. Tauri 실행 명령어:
echo    npm run dev:tauri
echo.
echo =======================================
pause 