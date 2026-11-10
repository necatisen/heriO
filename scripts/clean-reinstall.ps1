# Clean node_modules, caches, Android build dirs; reinstall deps.
# Usage: cd project ; .\scripts\clean-reinstall.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Project: $root" -ForegroundColor Cyan

$iconSrc = Join-Path $root "assets\images\app-icon.png"
$iconDst = Join-Path $root "assets\icon.png"
if (-not (Test-Path $iconSrc)) {
    Write-Error "Missing file: $iconSrc - add app icon under assets\images\"
}
Copy-Item -Path $iconSrc -Destination $iconDst -Force
Write-Host "OK: copied to assets\icon.png" -ForegroundColor Green

$dirs = @(
    "node_modules",
    ".expo",
    "android\.gradle",
    "android\app\build",
    "android\build"
)
foreach ($d in $dirs) {
    $p = Join-Path $root $d
    if (Test-Path $p) {
        Write-Host "Removing: $d" -ForegroundColor Yellow
        Remove-Item -Recurse -Force $p
    }
}

# Optional: also delete package-lock.json for full reset (uncomment next line)
# Remove-Item -Force (Join-Path $root "package-lock.json") -ErrorAction SilentlyContinue

Write-Host "npm cache clean --force" -ForegroundColor Cyan
npm cache clean --force

Write-Host "npm install" -ForegroundColor Cyan
npm install

Write-Host "npx expo install --fix" -ForegroundColor Cyan
npx expo install --fix

Write-Host ""
Write-Host "Done. Next: npx expo start --clear" -ForegroundColor Green
Write-Host "EAS: eas build --platform android --profile production --clear-cache" -ForegroundColor Green
Write-Host "eas-cli: npm install -g eas-cli@latest" -ForegroundColor Green
