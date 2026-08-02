@echo off
cd /d "%~dp0server"
echo Installing dependencies if needed...
python -m pip install -r requirements.txt
echo.
echo Starting TubeTone companion server...
python server.py
pause
