$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pairs = @(
  @{
    Name = "desktop"
    Src = Join-Path $root "src\grasp-rat-gold-runner.user.js"
    Dist = Join-Path $root "dist\grasp-rat-gold-runner.user.js"
  },
  @{
    Name = "mobile"
    Src = Join-Path $root "src\grasp-rat-gold-runner-mobile.user.js"
    Dist = Join-Path $root "dist\grasp-rat-gold-runner-mobile.user.js"
  }
)

foreach ($pair in $pairs) {
  node --check $pair.Src
  node --check $pair.Dist

  $srcHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair.Src).Hash
  $distHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pair.Dist).Hash
  if ($srcHash -ne $distHash) {
    throw "$($pair.Name) src and dist userscripts differ. Run scripts\sync-dist.ps1 first."
  }
}

$combinedUserscriptText = ($pairs | ForEach-Object {
  (Get-Content -Raw -LiteralPath $_.Src) + "`n" + (Get-Content -Raw -LiteralPath $_.Dist)
}) -join "`n"
if ($combinedUserscriptText -match "backdrop-filter|-webkit-backdrop-filter") {
  throw "HUD glass effect CSS found. Use plain semitransparent backgrounds instead."
}

Write-Host "Release checks passed."
