@echo off
SETLOCAL EnableDelayedExpansion

REM Print header
echo ===================================
echo   RESUME PARSER APPLICATION SUITE  
echo ===================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using PowerShell for better terminal management...
    
    REM Create PowerShell script to run all services in separate windows
    echo $authPath = "%CD%\auth-backend" > start-services.ps1
    echo $backendPath = "%CD%\backend\app" >> start-services.ps1
    echo $frontendPath = "%CD%\frontend" >> start-services.ps1
    echo. >> start-services.ps1
    echo Write-Host "Starting Auth Backend..." -ForegroundColor Yellow >> start-services.ps1
    echo Start-Process powershell -ArgumentList "-NoExit -Command cd '$authPath'; npm run dev" >> start-services.ps1
    echo. >> start-services.ps1
    echo Write-Host "Starting Backend..." -ForegroundColor Yellow >> start-services.ps1
    echo Start-Process powershell -ArgumentList "-NoExit -Command cd '$backendPath'; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" >> start-services.ps1
    echo. >> start-services.ps1
    echo Write-Host "Starting Frontend..." -ForegroundColor Yellow >> start-services.ps1
    echo Start-Process powershell -ArgumentList "-NoExit -Command cd '$frontendPath'; npm run dev" >> start-services.ps1
    echo. >> start-services.ps1
    echo Write-Host "All services started successfully!" -ForegroundColor Green >> start-services.ps1
    echo Write-Host "- Auth Backend: http://localhost:4000" -ForegroundColor Green >> start-services.ps1
    echo Write-Host "- Backend API: http://localhost:8000" -ForegroundColor Green >> start-services.ps1
    echo Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Green >> start-services.ps1
    echo Write-Host "Close all terminal windows to stop the application" -ForegroundColor Cyan >> start-services.ps1
    
    REM Run the PowerShell script
    powershell -ExecutionPolicy Bypass -File start-services.ps1
    
    REM Delete the temporary script
    del start-services.ps1
) else (
    REM Fall back to CMD if PowerShell is not available
    echo PowerShell not found. Using CMD windows...
    
    REM Start Auth Backend
    echo Starting Auth Backend...
    start "Auth Backend" cmd /k "cd auth-backend && npm run dev"
    
    REM Start Backend
    echo Starting Backend...
    start "Backend" cmd /k "cd backend\app && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    
    REM Start Frontend
    echo Starting Frontend...
    start "Frontend" cmd /k "cd frontend && npm run dev"
    
    echo All services started successfully!
    echo - Auth Backend: http://localhost:4000
    echo - Backend API: http://localhost:8000
    echo - Frontend: http://localhost:3000
    echo Close all terminal windows to stop the application
)

ENDLOCAL 