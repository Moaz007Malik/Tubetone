@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === Building YTMP installer ===
echo.

set ISCC=
if exist "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if "%ISCC%"=="" (
  echo ERROR: Inno Setup 6 not found.
  echo Install with: winget install JRSoftware.InnoSetup
  exit /b 1
)

if not exist "..\release\YTMP\YTMP.exe" (
  echo App not built yet — running build.bat first...
  call build.bat
  if errorlevel 1 exit /b 1
)

echo Staging ffmpeg for installer...
python stage_ffmpeg.py
if errorlevel 1 exit /b 1

echo Compiling installer with Inno Setup...
"%ISCC%" "installer\YTMP.iss"
if errorlevel 1 (
  echo Installer build FAILED.
  exit /b 1
)

echo.
echo DONE — installer ready:
echo   %~dp0..\release\YTMP-Setup.exe
echo.
echo Share YTMP-Setup.exe with friends (single file).
echo.
pause
