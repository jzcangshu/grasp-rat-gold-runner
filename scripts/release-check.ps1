$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "src\grasp-rat-gold-runner.user.js"
$dist = Join-Path $root "dist\grasp-rat-gold-runner.user.js"

node --check $src
node --check $dist

$srcHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $src).Hash
$distHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $dist).Hash
if ($srcHash -ne $distHash) {
  throw "src and dist userscripts differ. Run scripts\sync-dist.ps1 first."
}

$combinedUserscriptText = (Get-Content -Raw -LiteralPath $src) + "`n" + (Get-Content -Raw -LiteralPath $dist)
if ($combinedUserscriptText -match "backdrop-filter|-webkit-backdrop-filter") {
  throw "HUD glass effect CSS found. Use plain semitransparent backgrounds instead."
}

Write-Host "Release checks passed."
