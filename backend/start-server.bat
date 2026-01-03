@echo off
cd /d "%~dp0"
echo Starting Sikapa Backend Server...
echo.
node debug-server.js
pause
