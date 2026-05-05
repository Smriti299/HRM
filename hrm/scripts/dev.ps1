$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "hrm-backend"
$frontend = Join-Path $root "hrm-frontend"

Write-Host "Starting HRM backend on http://localhost:5000"
Write-Host "Starting HRM frontend on http://localhost:3000"
Write-Host ""
Write-Host "Press Ctrl+C to stop both."
Write-Host ""

$backendJob = Start-Job -Name "hrm-backend" -ScriptBlock {
  param($path)
  Set-Location $path
  npm.cmd start
} -ArgumentList $backend

$frontendJob = Start-Job -Name "hrm-frontend" -ScriptBlock {
  param($path)
  Set-Location $path
  npm.cmd run dev
} -ArgumentList $frontend

try {
  while ($true) {
    Receive-Job -Job $backendJob, $frontendJob -ErrorAction Continue

    if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
      Receive-Job -Job $backendJob, $frontendJob -ErrorAction Continue
      throw "One of the dev servers stopped. Check the output above."
    }

    Start-Sleep -Milliseconds 500
  }
}
finally {
  Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
  Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
}
