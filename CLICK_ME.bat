@echo off
taskkill /f /im node.exe >nul 2>&1
npx tsx server/init-db.ts
start "Server" cmd /k "npm run dev:server"
timeout /t 5 /nobreak >nul
start "Client" cmd /k "npm run dev:client"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
echo TaskFlowMaster started! Login: admin/admin or nara0/nara0
pause 