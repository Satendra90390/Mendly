# ============================================================
# bump-version.ps1 — Bumps app version across all files
# Usage: .\bump-version.ps1 2 1.1 "New feature description"
# ============================================================
param(
    [Parameter(Mandatory=$true)] [int]$Code,
    [Parameter(Mandatory=$true)] [string]$Name,
    [Parameter(Mandatory=$true)] [string]$Notes,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# --- Paths ---
$updateJs   = Join-Path $root "frontend\update.js"
$gradle     = Join-Path $root "android\app\build.gradle"
$mainPy     = Join-Path $root "backend\app\main.py"

Write-Host "Bumping to v$Name (code $Code)" -ForegroundColor Cyan

# --- update.js ---
(Get-Content $updateJs -Raw) `
    -replace 'code:\s*\d+', "code: $Code" `
    -replace 'name:\s*"[^"]*"', "`"name: `"$Name`"`"" |
    Set-Content $updateJs -NoNewline
Write-Host "  updated update.js" -ForegroundColor Green

# --- build.gradle ---
(Get-Content $gradle -Raw) `
    -replace 'versionCode\s+\d+', "versionCode $Code" `
    -replace 'versionName\s+"[^"]*"', "versionName `"$Name`"" |
    Set-Content $gradle -NoNewline
Write-Host "  updated build.gradle" -ForegroundColor Green

# --- main.py version endpoint ---
(Get-Content $mainPy -Raw) `
    -replace '"version_code":\s*\d+', "`"version_code`": $Code" `
    -replace '"version_name":\s*"[^"]*"', "`"version_name`": `"$Name`"" `
    -replace '"release_notes":\s*"[^"]*"', "`"release_notes`": `"$Notes`"" |
    Set-Content $mainPy -NoNewline
Write-Host "  updated main.py" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Version bumped to v$Name (code $Code)" -ForegroundColor Yellow
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Build APK in Android Studio"
Write-Host "  2. Upload APK to GitHub Releases as mendly.apk"
Write-Host "  3. git add -A && git commit -m 'release: v$Name'"
Write-Host "  4. git push (Render auto-deploys the new backend endpoint)"
