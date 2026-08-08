$ErrorActionPreference = "Stop"

$imagesDirectory = $PSScriptRoot
$catalogPath = Join-Path $imagesDirectory "images-catalog.js"
$extensions = @(".png", ".jpg", ".jpeg", ".webp")

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

Write-Host "Catalogue BlueFox actualise :" $catalogPath
Write-Host ($items.Count.ToString() + " image(s) referencee(s).")
