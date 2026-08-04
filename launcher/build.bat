@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === Building YTMP standalone .exe (production defaults) ===
echo.

if not exist "config.defaults.json" (
  echo ERROR: launcher\config.defaults.json is missing.
  echo Copy config.defaults.example.json to config.defaults.json and set your production URLs.
  exit /b 1
)

python -m pip install -U pip pyinstaller yt-dlp
if errorlevel 1 exit /b 1

python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name YTMP ^
  --icon "tubetone.ico" ^
  --collect-all yt_dlp ^
  --add-data "..\server;server" ^
  --add-data "tubetone.ico;." ^
  --add-data "..\icon.png;." ^
  --add-data "config.defaults.json;." ^
  --hidden-import license_client ^
  --hidden-import settings_store ^
  --hidden-import ytdlp_updater ^
  --hidden-import media_tools ^
  --hidden-import glass_ui ^
  --paths "..\server" ^
  --paths "." ^
  tubetone_app.py

if errorlevel 1 (
  echo Build FAILED.
  exit /b 1
)

set OUT=%~dp0..\release\YTMP
echo.
echo Assembling %OUT%
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
xcopy /e /i /y "dist\YTMP\*" "%OUT%\" >nul
copy /y "SHARE_WITH_FRIEND.txt" "%OUT%\README.txt" >nul
copy /y "config.defaults.json" "%OUT%\config.defaults.json" >nul
if exist "config.example.json" copy /y "config.example.json" "%OUT%\config.example.json" >nul

echo.
echo DONE — production defaults:
type "config.defaults.json"
echo.
echo Zip and share: %OUT%
echo.
if /I not "%1"=="--nopause" pause
