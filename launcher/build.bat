@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === Building TubeTone standalone .exe ===
echo.

python -m pip install -U pip pyinstaller yt-dlp
if errorlevel 1 exit /b 1

python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name TubeTone ^
  --icon "tubetone.ico" ^
  --collect-all yt_dlp ^
  --add-data "..\server;server" ^
  --add-data "tubetone.ico;." ^
  --add-data "..\icon.png;." ^
  --paths "..\server" ^
  tubetone_app.py

if errorlevel 1 (
  echo Build FAILED.
  exit /b 1
)

set OUT=%~dp0..\release\TubeTone
echo.
echo Assembling %OUT%
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
xcopy /e /i /y "dist\TubeTone\*" "%OUT%\" >nul
copy /y "SHARE_WITH_FRIEND.txt" "%OUT%\README.txt" >nul

echo.
echo DONE — zip and share:
echo   %OUT%
echo.
pause
