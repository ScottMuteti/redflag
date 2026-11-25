# Hosts RedFlag from this PC on a public link with Tailscale Funnel.
#
#   ./go-public.ps1         go live and copy the links to the clipboard
#   ./go-public.ps1 -Stop   take the links down and return to local mode

param([switch]$Stop)

Set-Location -Path $PSScriptRoot
$compose = @('compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.public.yml', '--env-file', '.env')
$report = New-Object System.Collections.Generic.List[string]

function Section($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Note($msg) { Write-Host $msg; $report.Add($msg) }
function Copy-Report { try { $report -join "`r`n" | Set-Clipboard; Write-Host "`nCopied to clipboard." -ForegroundColor Green } catch { Write-Host 'Could not copy to clipboard.' } }
function Fail($msg) { $report.Add("NOT LIVE: $msg"); Write-Host "`nNOT LIVE: $msg" -ForegroundColor Red; Copy-Report; exit 1 }

# 1) Tailscale: installed and signed in.
$ts = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path $ts)) { Fail 'Tailscale is not installed. Get it from https://tailscale.com/download/windows' }

if ($Stop) {
  Section 'Taking the public links down'
  & $ts funnel reset
  if ($LASTEXITCODE -ne 0) { Fail 'Could not turn Funnel off. Quit Tailscale to take the links down.' }
  Section 'Returning to local mode'
  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) { Fail 'Links are down, but local mode did not start.' }
  Note 'RedFlag is no longer public.'
  Copy-Report
  exit 0
}

Section 'Checking Tailscale and Docker'
$status = $null
try { $status = (& $ts status --json) -join "`n" | ConvertFrom-Json } catch { }
if (-not $status -or $status.BackendState -ne 'Running') { Fail 'Tailscale is not signed in. Open Tailscale and log in.' }
$hostName = "$($status.Self.DNSName)".TrimEnd('.')
if ($hostName -notlike '*.ts.net') { Fail 'No ts.net name. Turn on MagicDNS and HTTPS at https://login.tailscale.com/admin/dns' }
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Docker is not running. Start Docker Desktop.' }
if (-not (Test-Path '.env')) { Fail '.env is missing.' }

# 2) Public settings. The signing secret is made once, kept here, never printed.
Section 'Writing public settings'
$secret = ''
if (Test-Path '.env.public') {
  $m = Select-String -Path '.env.public' -Pattern '^JWT_SECRET=(.{32,})$' | Select-Object -Last 1
  if ($m) { $secret = $m.Matches[0].Groups[1].Value }
}
if (-not $secret) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
}
$lines = @(
  "JWT_SECRET=$secret",
  "PORTAL_URL=https://$hostName",
  "CORS_ORIGIN=https://$hostName",
  "WEBAUTHN_RP_ID=$hostName",
  "WEBAUTHN_ORIGIN=https://$hostName",
  "GOPHISH_PHISH_URL=https://${hostName}:8443",
  "PUBLIC_BACKEND_URL=https://${hostName}:10000"
)
[IO.File]::WriteAllLines((Join-Path $PSScriptRoot '.env.public'), [string[]]$lines, (New-Object Text.UTF8Encoding $false))

$portalPort = 5173
$m = Select-String -Path '.env' -Pattern '^PORTAL_PORT=(\d+)' | Select-Object -Last 1
if ($m) { $portalPort = $m.Matches[0].Groups[1].Value }

# 3) Build, then prove email login works before replacing the running engine.
Section 'Building'
docker @compose build simulation-engine risk-model portal
if ($LASTEXITCODE -ne 0) { Fail 'Build failed.' }

Section 'Checking Gmail login'
$check = "const e=require('/app/src/config/env').gmail;require('nodemailer').createTransport({service:'gmail',auth:{user:e.user,pass:e.appPassword}}).verify().then(()=>process.exit(0),()=>process.exit(1))"
docker @compose run --rm --no-deps -T simulation-engine node -e $check
if ($LASTEXITCODE -ne 0) { Fail 'Gmail rejected the login in .env. Nobody could receive login codes.' }

Section 'Starting RedFlag in public mode'
docker @compose up -d --renew-anon-volumes
if ($LASTEXITCODE -ne 0) { Fail 'Startup failed.' }
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4000/health" -TimeoutSec 3).StatusCode -eq 200) { $ok = $true; break } } catch { }
  Start-Sleep -Seconds 2
}
if (-not $ok) { Fail 'The engine did not become healthy.' }
docker @compose exec -T simulation-engine npm run gophish:setup
if ($LASTEXITCODE -ne 0) { Fail 'Gophish setup failed.' }

# 4) Publish. Tailscale may print a link to approve Funnel the first time.
Section 'Opening the public links'
foreach ($pair in @(@(443, $portalPort), @(8443, 8080), @(10000, 4001))) {
  & $ts funnel --bg "--https=$($pair[0])" "http://127.0.0.1:$($pair[1])"
  if ($LASTEXITCODE -ne 0) { & $ts funnel reset; Fail "Funnel port $($pair[0]) was refused. Approve Funnel in Tailscale, then run this again." }
}

Section 'Checking the links'
Start-Sleep -Seconds 5
$bad = 0
foreach ($c in @(@("https://$hostName/login", 200), @("https://$hostName/api/auth/me", 401), @("https://$hostName/api/campaigns/webhook/gophish", 404), @("https://${hostName}:10000/health", 200), @("https://${hostName}:10000/api/employees", 404))) {
  $code = 0
  for ($i = 0; $i -lt 6 -and $code -eq 0; $i++) {
    try { $code = [int](Invoke-WebRequest -UseBasicParsing $c[0] -TimeoutSec 20).StatusCode } catch { if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode } else { Start-Sleep -Seconds 5 } }
  }
  if ($code -ne $c[1]) { $bad++; Note "CHECK FAILED: $($c[0]) gave $code, expected $($c[1])" }
}

Note "RedFlag portal:  https://$hostName"
Note "Email tracking:  https://${hostName}:8443"
Note "SMS tracking:    https://${hostName}:10000"
if ($bad -eq 0) { Note 'All link checks passed (from this PC).' } else { Note 'Some checks failed. A new link can take up to 10 minutes; run this again.' }
Note 'Take down:  ./go-public.ps1 -Stop'
Copy-Report
if ($bad -gt 0) { exit 1 }
