$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pairs = @(
  @{
    Src = Join-Path $root "src\grasp-rat-gold-runner.user.js"
    Dist = Join-Path $root "dist\grasp-rat-gold-runner.user.js"
  },
  @{
    Src = Join-Path $root "src\grasp-rat-gold-runner-mobile.user.js"
    Dist = Join-Path $root "dist\grasp-rat-gold-runner-mobile.user.js"
  }
)

foreach ($pair in $pairs) {
  Copy-Item -LiteralPath $pair.Src -Destination $pair.Dist -Force
  node --check $pair.Src
  node --check $pair.Dist
}

Write-Host "Synced src to dist and syntax checks passed."
