# RedFlag one-command launcher (Windows).
# Starts the entire platform with Docker, waits until it is ready, seeds the
# demo data, and opens the portal. Safe to re-run: seeding skips if already done.
#
#   Right-click > Run with PowerShell, or in a terminal:  ./start.ps1

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Section($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# Local mode uses weaker settings, so never start it while the links are public.
$ts = Join-Path $env:ProgramFiles 'Tailscale	ailscale.exe'
if ((Test-Path $ts) -and ((& $ts funnel status) -match 'Funnel on')) {
  Write-Host 'RedFlag is public right now. Run ./go-public.ps1 -Stop first.' -ForegroundColor Red
  exit 1
}

# 1) Make sure Docker is running (start Docker Desktop if it isn't).
Section 'Checking Docker'
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Docker is not running. Starting Docker Desktop...' -ForegroundColor Yellow
  $dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dockerExe) {
    Start-Process $dockerExe | Out-Null
  } else {
    Write-Host 'Could not find Docker Desktop. Please install/start it, then re-run.' -ForegroundColor Red
    exit 1
  }
  Write-Host 'Waiting for the Docker engine to be ready (up to 3 minutes)...'
  $ready = $false
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 2
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  }
  if (-not $ready) { Write-Host 'Docker did not start in time. Open Docker Desktop, then re-run.' -ForegroundColor Red; exit 1 }
}
Write-Host 'Docker is ready.' -ForegroundColor Green

# 2) Ensure a .env exists (first run copies the template).
if (-not (Test-Path '.env')) {
  Section 'Creating .env from .env.example'
  Copy-Item '.env.example' '.env'
}

# Portal port can be overridden in .env (Windows sometimes reserves 5173).
$portalPort = 5173
$m = Select-String -Path '.env' -Pattern '^PORTAL_PORT=(\d+)' | Select-Object -Last 1
if ($m) { $portalPort = $m.Matches[0].Groups[1].Value }

# 3) Build and start every service in the background.
Section 'Building and starting all services (first run can take a few minutes)'
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Write-Host 'Startup failed. See the output above.' -ForegroundColor Red; exit 1 }

# 4) Wait for the engine to report healthy (it runs DB migrations on boot).
Section 'Waiting for the simulation engine'
$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:4000/health' -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $healthy) {
  Write-Host 'Engine not healthy yet. Check logs: docker compose logs -f simulation-engine' -ForegroundColor Yellow
}

# 5) Seed the demo organisation and logins (no-op if already seeded).
Section 'Seeding demo data'
docker compose exec -T simulation-engine npm run seed:demo

# 6) Done.
Section 'RedFlag is up'
Write-Host "Portal (admin + employee): http://localhost:$portalPort" -ForegroundColor Green
Write-Host 'Admin API health:          http://localhost:4000/health'
Write-Host ''
Write-Host 'Demo logins:' -ForegroundColor Green
Write-Host '  Admin:          admin@demo.redflag  / Demo1234!'
Write-Host '  Platform admin: system@demo.redflag / Demo1234!'
Write-Host '  (watch the seed output above for employee logins)'
Write-Host ''
Write-Host 'Stop everything with:  docker compose down'
Start-Process "http://localhost:$portalPort" | Out-Null
