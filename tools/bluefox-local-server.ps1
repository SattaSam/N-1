param(
    [string]$StartPage = "index.html",
    [string]$WindowTitle = "BlueFox Odyssey"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = $null
$port = 0

function Get-CustomMicroSceneTemplates {
    param([object]$Node)

    if ($null -eq $Node) { return }
    $idProperty = $Node.PSObject.Properties["id"]
    $objectsProperty = $Node.PSObject.Properties["objects"]
    if ($null -ne $idProperty -and $null -ne $objectsProperty) {
        if ([string]$Node.id -match '^MSC-CUSTOM-[A-Z0-9-]+$') {
            Write-Output $Node
        }
        return
    }
    if ($Node -is [System.Collections.IEnumerable] -and $Node -isnot [string]) {
        foreach ($item in $Node) {
            Get-CustomMicroSceneTemplates -Node $item
        }
        return
    }
    $valueProperty = $Node.PSObject.Properties["value"]
    if ($null -ne $valueProperty) {
        Get-CustomMicroSceneTemplates -Node $Node.value
    }
}

foreach ($attempt in 1..32) {
    $candidate = Get-Random -Minimum 49152 -Maximum 60000
    try {
        $listener = [System.Net.Sockets.TcpListener]::new(
            [System.Net.IPAddress]::Loopback,
            $candidate
        )
        $listener.Start()
        $port = $candidate
        break
    } catch {
        $listener = $null
    }
}

if ($null -eq $listener) {
    throw "Aucun port local temporaire n'a pu etre ouvert."
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mjs"  = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
}

$safeStartPage = $StartPage.TrimStart("/").Replace("\", "/")
$url = "http://127.0.0.1:$port/$safeStartPage"
Write-Host ""
Write-Host "$WindowTitle fonctionne en local sur :" -ForegroundColor Cyan
Write-Host $url -ForegroundColor White
Write-Host ""
Write-Host "Gardez cette fenetre ouverte pendant le jeu."
Write-Host "Fermez-la pour arreter le serveur local."
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::ASCII,
                $false,
                4096,
                $true
            )
            $requestLine = $reader.ReadLine()
            $requestHeaders = @{}
            while ($true) {
                $headerLine = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($headerLine)) { break }
                $separator = $headerLine.IndexOf(":")
                if ($separator -gt 0) {
                    $headerName = $headerLine.Substring(0, $separator).Trim().ToLowerInvariant()
                    $headerValue = $headerLine.Substring($separator + 1).Trim()
                    $requestHeaders[$headerName] = $headerValue
                }
            }

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $requestTarget = $parts[1].Split("?")[0]
            $requestBody = ""
            $contentLength = 0
            if ($requestHeaders.ContainsKey("content-length")) {
                [void][int]::TryParse($requestHeaders["content-length"], [ref]$contentLength)
            }
            if ($contentLength -gt 0) {
                if ($contentLength -gt 1048576) { throw "Corps de requete trop volumineux." }
                $bodyChars = New-Object char[] $contentLength
                $bodyRead = 0
                while ($bodyRead -lt $contentLength) {
                    $readNow = $reader.Read($bodyChars, $bodyRead, $contentLength - $bodyRead)
                    if ($readNow -le 0) { break }
                    $bodyRead += $readNow
                }
                $requestBody = -join $bodyChars[0..([Math]::Max(0, $bodyRead - 1))]
            }
            $decodedPath = [System.Net.WebUtility]::UrlDecode($requestTarget)
            if ($decodedPath -eq "/") { $decodedPath = "/index.html" }
            $relativePath = $decodedPath.TrimStart("/").Replace("/", "\")
            $candidatePath = [System.IO.Path]::GetFullPath(
                (Join-Path $projectRoot $relativePath)
            )
            $rootPath = [System.IO.Path]::GetFullPath($projectRoot)
            $rootPrefix = $rootPath.TrimEnd("\") + "\"

            $status = "200 OK"
            $body = $null
            $contentType = "application/octet-stream"
            if ($method -eq "GET" -and $decodedPath -eq "/api/custom-maps/next-index") {
                $contentType = "application/json; charset=utf-8"
                try {
                    $customMapsPath = Join-Path $projectRoot "data\custom-maps.json"
                    $customMaps = @()
                    if (Test-Path -LiteralPath $customMapsPath -PathType Leaf) {
                        $customMapsText = [System.IO.File]::ReadAllText($customMapsPath)
                        if (-not [string]::IsNullOrWhiteSpace($customMapsText)) {
                            $customMaps = @($customMapsText | ConvertFrom-Json)
                        }
                    }
                    $knownNumbers = @($customMaps | ForEach-Object { [int]$_.number })
                    Get-ChildItem -LiteralPath (Join-Path $projectRoot "Images") -File | ForEach-Object {
                        if ($_.BaseName -match '^(\d+)[^\d_]') { $knownNumbers += [int]$matches[1] }
                    }
                    $nextNumber = if ($knownNumbers.Count) { ($knownNumbers | Measure-Object -Maximum).Maximum + 1 } else { 1 }
                    $response = ConvertTo-Json @{ number = $nextNumber }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                } catch {
                    $status = "500 Internal Server Error"
                    $response = ConvertTo-Json @{ error = $_.Exception.Message }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                }
            } elseif ($method -eq "POST" -and $decodedPath -eq "/api/custom-maps") {
                $contentType = "application/json; charset=utf-8"
                try {
                    $draft = $requestBody | ConvertFrom-Json
                    if ($null -eq $draft -or [string]::IsNullOrWhiteSpace([string]$draft.name)) {
                        throw "Nom de map manquant."
                    }
                    if ([string]$draft.slug -notmatch '^[a-z0-9-]{1,42}$') {
                        throw "Nom technique de map invalide."
                    }
                    $plateauCount = [int]$draft.plateauCount
                    if ($plateauCount -lt 1 -or $plateauCount -gt 6) {
                        throw "Le nombre de plateaux doit etre compris entre 1 et 6."
                    }
                    if (@($draft.terrainUrls).Count -lt $plateauCount) {
                        throw "Une texture de terrain est requise pour chaque plateau."
                    }
                    $microScenes = @($draft.microScenes)
                    if ($microScenes.Count -gt 200) { throw "Trop de micro-scenes pour une map." }
                    foreach ($placement in $microScenes) {
                        if ([string]$placement.id -notmatch '^MSC-[A-Z0-9-]+$') { throw "Code de micro-scene invalide." }
                        if (@($placement.position).Count -ne 3 -or @($placement.rotation).Count -ne 3) { throw "Transformation de micro-scene incomplete." }
                    }
                    $customJsonPath = Join-Path $projectRoot "data\custom-maps.json"
                    $customJsPath = Join-Path $projectRoot "data\custom-maps.js"
                    $maps = @()
                    if (Test-Path -LiteralPath $customJsonPath -PathType Leaf) {
                        $existingText = [System.IO.File]::ReadAllText($customJsonPath)
                        if (-not [string]::IsNullOrWhiteSpace($existingText)) { $maps = @($existingText | ConvertFrom-Json) }
                    }
                    $knownNumbers = @($maps | ForEach-Object { [int]$_.number })
                    Get-ChildItem -LiteralPath (Join-Path $projectRoot "Images") -File | ForEach-Object {
                        if ($_.BaseName -match '^(\d+)[^\d_]') { $knownNumbers += [int]$matches[1] }
                    }
                    $number = if ($knownNumbers.Count) { ($knownNumbers | Measure-Object -Maximum).Maximum + 1 } else { 1 }
                    $padded = $number.ToString("00")
                    $index = "$padded-$($draft.slug)"
                    $map = [ordered]@{
                        id = "custom-map-$index"
                        number = $number
                        index = $index
                        name = [string]$draft.name
                        plateauCount = $plateauCount
                        profile = [string]$draft.profile
                        terrainUrls = @($draft.terrainUrls)
                        terrainUrl = @($draft.terrainUrls)[0]
                        sceneUrl = $draft.sceneUrl
                        seed = [int64]$draft.seed
                        palette = $draft.palette
                        customMicroScenes = $microScenes
                        createdAt = [DateTime]::UtcNow.ToString("o")
                    }
                    $maps += [pscustomobject]$map
                    $json = ConvertTo-Json -InputObject @($maps) -Depth 14
                    $utf8 = [System.Text.UTF8Encoding]::new($false)
                    [System.IO.File]::WriteAllText($customJsonPath, $json, $utf8)
                    [System.IO.File]::WriteAllText($customJsPath, "window.BlueFoxCustomMaps = $json;`n", $utf8)
                    $response = ConvertTo-Json @{ status = "saved"; id = $map["id"]; index = $index; number = $number }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                } catch {
                    $status = "400 Bad Request"
                    $response = ConvertTo-Json @{ error = $_.Exception.Message }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                }
            } elseif ($method -eq "POST" -and $decodedPath -eq "/api/custom-micro-scenes") {
                $contentType = "application/json; charset=utf-8"
                try {
                    $template = $requestBody | ConvertFrom-Json
                    if ($null -eq $template -or $template.id -notmatch '^MSC-CUSTOM-[A-Z0-9-]{1,40}$') {
                        throw "Code de micro-scene invalide."
                    }
                    if ([string]::IsNullOrWhiteSpace([string]$template.name)) {
                        throw "Nom de micro-scene manquant."
                    }
                    $templateObjects = @($template.objects)
                    if ($templateObjects.Count -lt 1 -or $templateObjects.Count -gt 200) {
                        throw "Une micro-scene doit contenir entre 1 et 200 objets."
                    }
                    foreach ($entry in $templateObjects) {
                        if ([string]$entry.type -notmatch '^[a-z0-9_]+$') {
                            throw "Type d'objet invalide dans la micro-scene."
                        }
                        if (@($entry.offset).Count -ne 3 -or @($entry.rotation).Count -ne 3) {
                            throw "Transformation d'objet incomplete."
                        }
                    }

                    $customJsonPath = Join-Path $projectRoot "data\custom-micro-scenes.json"
                    $customJsPath = Join-Path $projectRoot "data\custom-micro-scenes.js"
                    $templates = @()
                    if (Test-Path -LiteralPath $customJsonPath -PathType Leaf) {
                        $existingText = [System.IO.File]::ReadAllText($customJsonPath)
                        if (-not [string]::IsNullOrWhiteSpace($existingText)) {
                            $existingRegistry = $existingText | ConvertFrom-Json
                            $templates = @(Get-CustomMicroSceneTemplates -Node $existingRegistry)
                        }
                    }
                    $requestedId = [string]$template.id
                    $uniqueId = $requestedId
                    $suffix = 2
                    $knownIds = @{}
                    foreach ($existingTemplate in $templates) {
                        $knownIds[[string]$existingTemplate.id] = $true
                    }
                    while ($knownIds.ContainsKey($uniqueId)) {
                        $uniqueId = "$requestedId-$($suffix.ToString('000'))"
                        $suffix += 1
                    }
                    $template.id = $uniqueId
                    $updatedTemplates = New-Object System.Collections.Generic.List[object]
                    foreach ($existingTemplate in $templates) {
                        [void]$updatedTemplates.Add($existingTemplate)
                    }
                    [void]$updatedTemplates.Add($template)
                    $templates = [object[]]$updatedTemplates.ToArray()
                    $json = ConvertTo-Json -InputObject $templates -Depth 12
                    $utf8 = [System.Text.UTF8Encoding]::new($false)
                    [System.IO.File]::WriteAllText($customJsonPath, $json, $utf8)
                    [System.IO.File]::WriteAllText(
                        $customJsPath,
                        "window.BlueFoxCustomMicroScenes = $json;`n",
                        $utf8
                    )
                    $response = ConvertTo-Json @{ status = "saved"; id = $uniqueId; count = $templateObjects.Count; total = $templates.Count }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                } catch {
                    $status = "400 Bad Request"
                    $response = ConvertTo-Json @{ error = $_.Exception.Message }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                }
            } elseif (
                -not $candidatePath.StartsWith(
                    $rootPrefix,
                    [System.StringComparison]::OrdinalIgnoreCase
                ) -or
                -not (Test-Path -LiteralPath $candidatePath -PathType Leaf)
            ) {
                $status = "404 Not Found"
                $body = [System.Text.Encoding]::UTF8.GetBytes("Fichier introuvable")
                $contentType = "text/plain; charset=utf-8"
            } else {
                $body = [System.IO.File]::ReadAllBytes($candidatePath)
                $extension = [System.IO.Path]::GetExtension($candidatePath).ToLowerInvariant()
                if ($mimeTypes.ContainsKey($extension)) {
                    $contentType = $mimeTypes[$extension]
                }
            }

            $header =
                "HTTP/1.1 $status`r`n" +
                "Content-Type: $contentType`r`n" +
                "Content-Length: $($body.Length)`r`n" +
                "Cache-Control: no-cache`r`n" +
                "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD") {
                $stream.Write($body, 0, $body.Length)
            }
            $stream.Flush()
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
