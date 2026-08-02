@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === TubeTone Windows build ===
echo.

python -m pip install -U pip pyinstaller yt-dlp
if errorlevel 1 exit /b 1

echo.
echo Building TubeTone (onedir — more reliable than one-file)...
python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name TubeTone ^
  --collect-all yt_dlp ^
  --add-data "..\server;server" ^
  --paths "..\server" ^
  tubetone_app.py

if errorlevel 1 (
  echo Build FAILED.
  exit /b 1
)

set OUT=%~dp0..\release\TubeTone
echo.
echo Assembling share folder: %OUT%
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"

xcopy /e /i /y "dist\TubeTone\*" "%OUT%\" >nul
xcopy /e /i /y "..\extension\*" "%OUT%\extension\" >nul
copy /y "SHARE_WITH_FRIEND.txt" "%OUT%\README.txt" >nul

echo.
echo DONE.
echo.
echo Zip and send this folder to your friend:
echo   %OUT%
echo.
echo Inside it they run:  TubeTone.exe
echo.
pause
