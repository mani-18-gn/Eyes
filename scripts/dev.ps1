Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "     REALITYLENS — SEE IT. GET IT. DO IT.        " -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Activate Python virtual environment and start backend
Write-Host "[1/2] Starting RealityLens Core Backend on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; `$env:PYTHONPATH='.'; .\.venv\Scripts\uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# 2. Start Vite Web App
Write-Host "[2/2] Starting RealityLens Web Lens & Brain on http://localhost:5173..." -ForegroundColor Green
$webJob = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\web'; npm run dev" -PassThru

Write-Host "`nAll RealityLens systems launched successfully!" -ForegroundColor Cyan
Write-Host "Backend API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Web Application:  http://localhost:5173" -ForegroundColor Yellow
