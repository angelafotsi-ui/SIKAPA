@echo off
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak
cd /d "C:\Users\HEDGEHOG\Downloads\SIKAPA\backend"
node server.js
pause
