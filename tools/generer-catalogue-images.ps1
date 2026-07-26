$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$imagesDirectory = Join-Path $projectRoot "Images"
$catalogPath = Join-Path $imagesDirectory "images-catalog.js"
$extensions = @(".png", ".jpg", ".jpeg", ".webp")

if (-not (Test-Path $imagesDirectory)) {
    New-Item -ItemType Directory -Path $imagesDirectory | Out-Null
}

$items = Get-ChildItem -Path $imagesDirectory -File |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name |
    ForEach-Object {
        @{
            name = $_.Name
            url = "./Images/$($_.Name)"
        } | ConvertTo-Json -Compress
    }

$json = "[" + ($items -join ",") + "]"
$content = "window.BLUEFOX_MAP_ASSETS?.register($json);"
Set-Content -Path $catalogPath -Value $content -Encoding UTF8

Write-Host "Catalogue BlueFox genere :" $catalogPath
Write-Host ($items.Count.ToString() + " image(s) referencee(s).")
