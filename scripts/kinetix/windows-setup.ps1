# Kinetix on the laptop: Ollama (the text model), Docker (the server), Tailscale (the phone's way in).
# Run from the repository folder, in PowerShell. Idempotent: running it again changes nothing that is right.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo

# 1. The tools must exist. Stop with the install link if one is missing.
$tools = @(
  @{ name = 'docker';    url = 'https://www.docker.com/products/docker-desktop/' },
  @{ name = 'ollama';    url = 'https://ollama.com/download' },
  @{ name = 'tailscale'; url = 'https://tailscale.com/download/windows' }
)
$missing = $tools | Where-Object { -not (Get-Command $_.name -ErrorAction SilentlyContinue) }
if ($missing) {
  foreach ($t in $missing) { Write-Host "Missing: $($t.name). Install it: $($t.url)" }
  exit 1
}

# 2. Ollama: keep the model loaded at 8192 tokens of context, and listen on the LAN for Docker.
[Environment]::SetEnvironmentVariable('OLLAMA_CONTEXT_LENGTH', '8192', 'User')
[Environment]::SetEnvironmentVariable('OLLAMA_HOST', '0.0.0.0:11434', 'User')
Write-Host 'Ollama settings saved. Quit Ollama from the tray and start it again, then press Enter.'
Read-Host | Out-Null

# 3. The text model.
ollama pull qwen3.5:4b

# 4. The settings file. The Gemini key is typed in once and never printed.
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env' }
$envText = Get-Content '.env' -Raw
if ($envText -notmatch '(?m)^GEMINI_API_KEY=.+') {
  $secure = Read-Host 'Gemini API key (typed, not shown)' -AsSecureString
  $plain = [System.Net.NetworkCredential]::new('', $secure).Password
  if ($plain) {
    $envText = $envText -replace '(?m)^GEMINI_API_KEY=.*$', "GEMINI_API_KEY=$plain"
    Set-Content -Path '.env' -Value $envText -NoNewline
  }
  $plain = $null
}

# 5. The server.
docker compose up -d --build

# 6. Routing and the Gemini key into the server's data folder (the script runs inside the api image).
docker compose exec api node scripts/kinetix-setup.mjs

# 7. Tailscale: the phone reaches the server over the tailnet, HTTPS, port 8080.
tailscale serve --bg 8080
$dns = (tailscale status --json | ConvertFrom-Json).Self.DNSName.TrimEnd('.')
Write-Host ""
Write-Host "Server address for the phone: https://$dns"

# 8. Pairing the phone.
Write-Host ""
Write-Host 'On the iPhone: open Kinetix, Settings, Account, "Pair the mobile app". Server = the address above.'
Write-Host 'Keep this laptop awake while plugged in (Settings, Power, never sleep when plugged in).'
