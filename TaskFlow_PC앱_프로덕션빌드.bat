@echo off
chcp 65001 >nul
title TaskFlow PC 앱 프로덕션 빌드
echo.
echo =========================================
echo    TaskFlow PC 앱 프로덕션 빌드 도구
echo =========================================
echo.

echo 📦 프로덕션 빌드를 시작합니다...
echo ⚠️  이 작업은 5-10분 정도 소요됩니다.
echo.

:: 클라이언트 프로덕션 빌드
echo [1단계] 클라이언트 프로덕션 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 클라이언트 빌드 실패!
    pause
    exit /b 1
)
echo ✅ 클라이언트 빌드 완료!
echo.

:: Tauri 프로덕션 빌드 및 MSI 생성
echo [2단계] Tauri 프로덕션 빌드 및 MSI 설치파일 생성 중...
set PATH=%USERPROFILE%\.cargo\bin;%PATH%
call npx tauri build
if %errorlevel% neq 0 (
    echo ❌ Tauri 빌드 실패!
    pause
    exit /b 1
)

echo.
echo ✅ 프로덕션 빌드 완료!
echo.
echo 📂 생성된 파일:
echo   - EXE: src-tauri\target\release\app.exe
echo   - MSI: src-tauri\target\release\bundle\msi\
echo.
echo 🎉 배포 준비가 완료되었습니다!
echo.
pause 