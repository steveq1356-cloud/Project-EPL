@echo off
rem Double-click to start EPL and open it in your browser.
rem Keep this window open while you use the app; close it to stop EPL.
title EPL - Engineering Project Log
cd /d "%~dp0"

rem Already running? Just open it.
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 3001)).Close(); exit 0 } catch { exit 1 }"
if %errorlevel%==0 (
  start "" http://127.0.0.1:3001
  exit /b
)

echo Building EPL...
call npm run build --silent
if errorlevel 1 (
  echo.
  echo Build failed. Try running "npm install" in this folder, then start again.
  pause
  exit /b 1
)

rem Open the browser once the server is answering.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 40; $i++) { try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 3001)).Close(); Start-Process 'http://127.0.0.1:3001'; break } catch { Start-Sleep -Milliseconds 250 } }"

echo.
echo EPL is running at http://127.0.0.1:3001  (close this window to stop it)
echo.
node server/index.js
pause
