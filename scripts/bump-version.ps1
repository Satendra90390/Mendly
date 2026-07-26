# ============================================================
# bump-version.ps1 — Bumps app version across all files
# Usage: .\bump-version.ps1 4.1.0 16 "New feature description"
# ============================================================
param(
    [Parameter(Mandatory=$true)] [string]$Name,
    [Parameter(Mandatory=$true)] [int]$CacheVersion,
    [Parameter(Mandatory=$true)] [string]$Notes
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

# --- Paths ---
$swJs      = Join-Path $root "frontend\sw.js"
$mainPy    = Join-Path $root "backend\app\main.py"

Write-Host "Bumping to v$Name (cache v$CacheVersion)" -ForegroundColor Cyan

# --- sw.js cache name ---
(Get-Content $swJs -Raw) `
    -replace 'CACHE_NAME\s*=\s*"mendly-v\d+"', "CACHE_NAME = `"mendly-v$CacheVersion`"" |
    Set-Content $swJs -NoNewline
Write-Host "  updated sw.js (cache v$CacheVersion)" -ForegroundColor Green

# --- main.py FastAPI constructor ---
(Get-Content $mainPy -Raw) `
    -replace 'version="[\d.]+"', "version=`"$Name`"" |
    Set-Content $mainPy -NoNewline

# --- main.py health endpoint ---
(Get-Content $mainPy -Raw) `
    -replace '"version":\s*"[\d.]+"', "`"version`": `"$Name`"" `
    -replace '"release_notes":\s*"[^"]*"', "`"release_notes`": `"$Notes`"" |
    Set-Content $mainPy -NoNewline
Write-Host "  updated main.py (v$Name)" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Version bumped to v$Name (cache v$CacheVersion)" -ForegroundColor Yellow
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. git add -A"
Write-Host "  2. git commit -m 'release: v$Name'"
Write-Host "  3. git push (Render + Vercel auto-deploy)"
