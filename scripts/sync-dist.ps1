$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "src\grasp-rat-gold-runner.user.js"
$dist = Join-Path $root "dist\grasp-rat-gold-runner.user.js"

Copy-Item -LiteralPath $src -Destination $dist -Force
node --check $src
node --check $dist

Write-Host "Synced src to dist and syntax checks passed."
