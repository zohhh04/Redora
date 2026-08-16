# start-tunnels.ps1 — expose Redora to the internet (any network) with a SINGLE
# free ngrok tunnel. The backend serves the built frontend (frontend/dist), so
# one tunnel to :5000 serves both the app and the API on the same origin.
#
# Prereq: a free ngrok authtoken (one time):  ngrok config add-authtoken <TOKEN>
# Prereq: the backend must be running on :5000 (npm run dev in /backend)
# Prereq: a frontend build must exist (npm run build in /frontend)
#
# Run:  powershell -ExecutionPolicy Bypass -File .\start-tunnels.ps1

$ErrorActionPreference = "Stop"

function Find-Ngrok {
  $c = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe",
    "$env:USERPROFILE\ngrok.exe"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  throw "ngrok not found. Install it:  winget install Ngrok.Ngrok"
}

$NGROK = Find-Ngrok
Write-Host "Using ngrok: $NGROK" -ForegroundColor Cyan

# ---- 1. authtoken check ----
& $NGROK config check 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "ngrok needs a free authtoken. Sign up at https://ngrok.com, then:" -ForegroundColor Yellow
  Write-Host "  ngrok config add-authtoken <YOUR_TOKEN>" -ForegroundColor Yellow
  Write-Host "Then run this script again." -ForegroundColor Yellow
  exit 1
}

# ---- 2. backend reachable? ----
try {
  Invoke-WebRequest "http://localhost:5000/api/health" -TimeoutSec 3 | Out-Null
  Write-Host "Backend is up on :5000" -ForegroundColor Green
} catch {
  Write-Host "WARNING: backend not reachable on :5000 yet. Start it (npm run dev in /backend) in another terminal." -ForegroundColor Yellow
}

# ---- 3. start the single tunnel (detached) ----
$log = Join-Path $env:TEMP "redora-ngrok.log"
$proc = Start-Process -FilePath $NGROK -ArgumentList "http 5000 --log stdout --log-format logfmt --log-level warn" `
  -RedirectStandardOutput $log -WindowStyle Hidden -PassThru

# ---- 4. read the public URL from ngrok's local API ----
$url = $null
for ($i = 0; $i -lt 20; $i++) {
  try {
    $r = Invoke-RestMethod "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
    $t = $r.tunnels | Where-Object { $_.public_url } | Select-Object -First 1
    if ($t) { $url = $t.public_url; break }
  } catch { }
  Start-Sleep -Seconds 2
}

if (-not $url) {
  Write-Host "Tunnel URL not ready yet. Check the log: $log" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Your app is now PUBLIC (works on any phone / any network):" -ForegroundColor Green
Write-Host "   SITE  : $url" -ForegroundColor Cyan
Write-Host ""
Write-Host "Open that URL on any phone. API + socket + app are all on the same origin." -ForegroundColor Green
Write-Host "To stop the tunnel:  Get-Process ngrok | Stop-Process"