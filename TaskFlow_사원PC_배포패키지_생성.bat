@echo off
chcp 65001 >nul
title TaskFlow 사원PC 배포패키지 생성기
echo.
echo ========================================
echo    TaskFlow 사원PC 배포패키지 생성기
echo ========================================
echo.

:: 배포 디렉토리 생성
if not exist "배포패키지" mkdir "배포패키지"
if not exist "배포패키지\TaskFlow_사원PC" mkdir "배포패키지\TaskFlow_사원PC"

echo [1단계] EXE 파일 복사 중...
if exist "src-tauri\target\debug\app.exe" (
    copy "src-tauri\target\debug\app.exe" "배포패키지\TaskFlow_사원PC\TaskFlow.exe" >nul
    echo ✅ EXE 파일 복사 완료 (17MB)
) else (
    echo ❌ EXE 파일이 없습니다. 먼저 빌드해주세요.
    pause
    exit /b 1
)

echo [2단계] 사원PC용 실행 스크립트 생성 중...
(
echo @echo off
echo chcp 65001 ^>nul
echo title TaskFlow 업무관리시스템
echo echo.
echo echo ===================================
echo echo    TaskFlow 업무관리시스템
echo echo ===================================
echo echo.
echo echo 🚀 TaskFlow를 시작합니다...
echo echo 💡 로그인 정보:
echo echo    - 관리자: admin / admin
echo echo    - 일반사용자: nara0~nara5 / nara0~nara5
echo echo.
echo start "" TaskFlow.exe
echo echo ✅ TaskFlow가 실행되었습니다!
echo echo 📌 창이 보이지 않으면 작업표시줄을 확인하세요.
echo pause
) > "배포패키지\TaskFlow_사원PC\TaskFlow_실행.bat"

echo [3단계] 설치 가이드 생성 중...
(
echo # TaskFlow 업무관리시스템 - 사원PC 설치 가이드
echo.
echo ## 📦 설치 방법
echo 1. **TaskFlow_사원PC** 폴더를 **C:\Program Files\** 에 복사
echo 2. **TaskFlow_실행.bat** 더블클릭하여 실행
echo 3. 바탕화면에 바로가기 만들기 ^(선택사항^)
echo.
echo ## 🔑 로그인 정보
echo - **관리자**: admin / admin
echo - **일반사용자**: nara0~nara5 / nara0~nara5
echo.
echo ## 🌐 서버 연결
echo - 자동으로 중앙 서버에 연결됩니다
echo - 인터넷 연결이 필요합니다
echo.
echo ## 🚨 문제 해결
echo - 실행이 안 될 경우: 관리자 권한으로 실행
echo - 로그인이 안 될 경우: IT 담당자에게 문의
echo.
echo ## 📞 지원
echo - IT 담당자: [연락처]
echo - 이메일: [이메일주소]
) > "배포패키지\TaskFlow_사원PC\설치가이드.md"

echo [4단계] 바탕화면 바로가기 생성 스크립트...
(
echo @echo off
echo echo 바탕화면에 TaskFlow 바로가기를 생성합니다...
echo set SCRIPT="%TEMP%\CreateShortcut.vbs"
echo echo Set oWS = WScript.CreateObject^("WScript.Shell"^) ^> %%SCRIPT%%
echo echo sLinkFile = "%%USERPROFILE%%\Desktop\TaskFlow.lnk" ^>^> %%SCRIPT%%
echo echo Set oLink = oWS.CreateShortcut^(sLinkFile^) ^>^> %%SCRIPT%%
echo echo oLink.TargetPath = "%%~dp0TaskFlow.exe" ^>^> %%SCRIPT%%
echo echo oLink.WorkingDirectory = "%%~dp0" ^>^> %%SCRIPT%%
echo echo oLink.Description = "TaskFlow 업무관리시스템" ^>^> %%SCRIPT%%
echo echo oLink.Save ^>^> %%SCRIPT%%
echo cscript /nologo %%SCRIPT%%
echo del %%SCRIPT%%
echo echo ✅ 바탕화면에 TaskFlow 바로가기가 생성되었습니다!
echo pause
) > "배포패키지\TaskFlow_사원PC\바탕화면_바로가기_생성.bat"

echo.
echo ✅ 배포 패키지 생성 완료!
echo.
echo 📂 생성된 파일:
echo   - 배포패키지\TaskFlow_사원PC\TaskFlow.exe (17MB)
echo   - 배포패키지\TaskFlow_사원PC\TaskFlow_실행.bat
echo   - 배포패키지\TaskFlow_사원PC\설치가이드.md
echo   - 배포패키지\TaskFlow_사원PC\바탕화면_바로가기_생성.bat
echo.
echo 🎉 이제 "TaskFlow_사원PC" 폴더를 각 사원 PC에 복사하면 됩니다!
echo.
echo 💡 사원들이 해야 할 일:
echo   1. TaskFlow_사원PC 폴더를 C:\Program Files\에 복사
echo   2. TaskFlow_실행.bat 더블클릭
echo   3. 끝!
echo.
pause 