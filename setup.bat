@echo off
:: setup.bat - Initial setup script for Minecraft Modpack Manager

@echo =============================================
@echo Minecraft Modpack Manager - Initial Setup
@echo =============================================
@echo.

echo Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8 or later from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

:: Get Python version and check if it's 3.8+
python -c "import sys; print('Found Python {0}.{1}.{2}'.format(sys.version_info.major, sys.version_info.minor, sys.version_info.micro))"
python -c "import sys; sys.exit(0) if sys.version_info >= (3, 8) else sys.exit(1)"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python 3.8 or later is required.
    echo Please upgrade your Python installation.
    pause
    exit /b 1
)

echo Python installation looks good!

:: Create virtual environment
echo.
echo Creating Python virtual environment...
python -m venv venv
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create virtual environment
    echo This might be due to missing permissions or Python installation issues.
    echo Try running this script as administrator.
    pause
    exit /b 1
)

:: Activate virtual environment and install dependencies
echo.
echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to activate virtual environment
    echo This might be due to system restrictions or missing files.
    echo Try deleting the 'venv' folder and running this script again.
    pause
    exit /b 1
)

:: Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Failed to upgrade pip, continuing anyway...
)

:: Install requirements
echo.
echo Installing required packages...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install requirements
    pause
    exit /b 1
)

:: Create necessary directories
echo.
echo Creating necessary directories...
if not exist "modpacks" mkdir modpacks
if not exist "docs\projects" mkdir "docs\projects"
if not exist "docs\css" mkdir "docs\css"
if not exist "docs\js" mkdir "docs\js"

:: Create default config if it doesn't exist
if not exist "config.json" (
    echo {
    echo     "curseforge_api_key": ""
    echo } > config.json
)

echo.
echo =============================================
echo Setup completed successfully!
echo =============================================
echo.
echo To start the Modpack Manager, run:
echo   run.bat
echo.
echo Note: If you want to use CurseForge API features,
echo edit config.json and add your API key.
echo.
pause
