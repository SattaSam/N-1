param(
    [string]$StartPage = "index.html",
    [string]$WindowTitle = "BlueFox Odyssey"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = $null
$port = 0
$utf8 = [System.Text.UTF8Encoding]::new($false)
$savesRoot = Join-Path $projectRoot "saves"

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        [void](New-Item -ItemType Directory -Path $Path -Force)
    }
}

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

function Get-SavePath {
    param([string]$Slot)
    switch ($Slot) {
        "auto"     { return Join-Path $savesRoot "autosave.json" }
        "recovery" { return Join-Path $savesRoot "recovery.json" }
        "1"        { return Join-Path $savesRoot "slot-1.json" }
        "2"        { return Join-Path $savesRoot "slot-2.json" }
        default    { throw "Emplacement de sauvegarde invalide." }
    }
}

function Test-SaveDocument {
    param([object]$Document)
    if ($null -eq $Document) { throw "Sauvegarde vide." }
    if ([string]$Document.format -ne "bluefox-save-file") {
        throw "Format de sauvegarde invalide."
    }
    if ([int]$Document.schemaVersion -ne 1) {
        throw "Version de sauvegarde non prise en charge."
    }
    if ($null -eq $Document.state) {
        throw "État de sauvegarde absent."
    }
    if ([int64]$Document.savedAt -le 0) {
        throw "Date de sauvegarde invalide."
    }
}

function Write-AtomicJson {
    param(
        [string]$Path,
        [string]$Json
    )
    Ensure-Directory -Path (Split-Path -Parent $Path)
    $tempPath = "$Path.tmp"
    [System.IO.File]::WriteAllText($tempPath, $Json, $utf8)
    [void]($Json | ConvertFrom-Json)
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        [System.IO.File]::Replace($tempPath, $Path, $null, $true)
    } else {
        [System.IO.File]::Move($tempPath, $Path)
    }
}

function Rotate-Autosaves {
    Ensure-Directory -Path $savesRoot
    for ($index = 5; $index -ge 2; $index--) {
        $source = Join-Path $savesRoot ("autosave-{0}.json" -f ($index - 1))
        $target = Join-Path $savesRoot ("autosave-{0}.json" -f $index)
        if (Test-Path -LiteralPath $source -PathType Leaf) {
            Copy-Item -LiteralPath $source -Destination $target -Force
        }
    }
    $current = Join-Path $savesRoot "autosave.json"
    $first = Join-Path $savesRoot "autosave-1.json"
    if (Test-Path -LiteralPath $current -PathType Leaf) {
        Copy-Item -LiteralPath $current -Destination $first -Force
    }
}

function Read-SaveText {
    param([string]$Slot)
    $path = Get-SavePath -Slot $Slot
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        return $null
    }
    return [System.IO.File]::ReadAllText($path)
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
    throw "Aucun port local temporaire n'a pu être ouvert."
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

Ensure-Directory -Path $savesRoot

$safeStartPage = $StartPage.TrimStart("/").Replace("\", "/")
$url = "http://127.0.0.1:$port/$safeStartPage"
Write-Host ""
Write-Host "$WindowTitle fonctionne en local sur :" -ForegroundColor Cyan
Write-Host $url -ForegroundColor White
Write-Host ""
Write-Host "Sauvegardes fichiers : $savesRoot" -ForegroundColor Green
Write-Host "Gardez cette fenêtre ouverte pendant le jeu."
Write-Host "Fermez-la pour arrêter le serveur local."
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new(
                $stream,
                [System.Text.Encoding]::UTF8,
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
                continue
            }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $requestTarget = $parts[1].Split("?")[0]
            $requestBody = ""
            $contentLength = 0

            if ($requestHeaders.ContainsKey("content-length")) {
                [void][int]::TryParse(
                    $requestHeaders["content-length"],
                    [ref]$contentLength
                )
            }

            if ($contentLength -gt 0) {
                if ($contentLength -gt 8388608) {
                    throw "Corps de requête trop volumineux."
                }
                $buffer = New-Object byte[] $contentLength
                $bodyRead = 0
                while ($bodyRead -lt $contentLength) {
                    $readNow = $stream.Read(
                        $buffer,
                        $bodyRead,
                        $contentLength - $bodyRead
                    )
                    if ($readNow -le 0) { break }
                    $bodyRead += $readNow
                }
                $requestBody = [System.Text.Encoding]::UTF8.GetString(
                    $buffer,
                    0,
                    $bodyRead
                )
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

            if ($decodedPath -match '^/api/saves/(auto|recovery|1|2)$') {
                $slot = $matches[1]
                $contentType = "application/json; charset=utf-8"
                try {
                    if ($method -eq "GET") {
                        $saveText = Read-SaveText -Slot $slot
                        if ($null -eq $saveText) {
                            $status = "404 Not Found"
                            $body = [System.Text.Encoding]::UTF8.GetBytes(
                                '{"error":"Sauvegarde absente."}'
                            )
                        } else {
                            [void]($saveText | ConvertFrom-Json)
                            $body = [System.Text.Encoding]::UTF8.GetBytes($saveText)
                        }
                    } elseif ($method -eq "POST") {
                        $document = $requestBody | ConvertFrom-Json
                        Test-SaveDocument -Document $document
                        if ([string]$document.slot -ne $slot) {
                            throw "L'emplacement du document ne correspond pas à l'URL."
                        }
                        if ($slot -eq "auto") {
                            Rotate-Autosaves
                        }
                        $path = Get-SavePath -Slot $slot
                        Write-AtomicJson -Path $path -Json $requestBody
                        $verifiedText = [System.IO.File]::ReadAllText($path)
                        $verified = $verifiedText | ConvertFrom-Json
                        Test-SaveDocument -Document $verified
                        $body = [System.Text.Encoding]::UTF8.GetBytes($verifiedText)
                    } elseif ($method -eq "DELETE" -and $slot -eq "auto") {
                        @(
                            "autosave.json",
                            "autosave-1.json",
                            "autosave-2.json",
                            "autosave-3.json",
                            "autosave-4.json",
                            "autosave-5.json"
                        ) | ForEach-Object {
                            $path = Join-Path $savesRoot $_
                            if (Test-Path -LiteralPath $path -PathType Leaf) {
                                Remove-Item -LiteralPath $path -Force
                            }
                        }
                        $status = "204 No Content"
                        $body = [byte[]]@()
                    } else {
                        $status = "405 Method Not Allowed"
                        $body = [System.Text.Encoding]::UTF8.GetBytes(
                            '{"error":"Méthode non autorisée."}'
                        )
                    }
                } catch {
                    $status = "400 Bad Request"
                    $response = ConvertTo-Json @{ error = $_.Exception.Message }
                    $body = [System.Text.Encoding]::UTF8.GetBytes($response)
                }
            } elseif ($method -eq "GET" -and $decodedPath -eq "/api/custom-maps/next-index") {
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
                        if ($_.BaseName -match '^(\d+)[^\d_]') {
                            $knownNumbers += [int]$matches[1]
                        }
                    }
                    $nextNumber = if ($knownNumbers.Count) {
                        ($knownNumbers | Measure-Object -Maximum).Maximum + 1
                    } else {
                        1
                    }
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
                        throw "Le nombre de plateaux doit être compris entre 1 et 6."
                    }
                    if (@($draft.terrainUrls).Count -lt $plateauCount) {
                        throw "Une texture de terrain est requise pour chaque plateau."
                    }
                    $microScenes = @($draft.microScenes)
                    if ($microScenes.Count -gt 200) {
                        throw "Trop de micro-scènes pour une map."
                    }
                    foreach ($placement in $microScenes) {
                        if ([string]$placement.id -notmatch '^MSC-[A-Z0-9-]+$') {
                            throw "Code de micro-scène invalide."
                        }
                        if (@($placement.position).Count -ne 3 -or @($placement.rotation).Count -ne 3) {
                            throw "Transformation de micro-scène incomplète."
                        }
                    }

                    $customJsonPath = Join-Path $projectRoot "data\custom-maps.json"
                    $customJsPath = Join-Path $projectRoot "data\custom-maps.js"
                    $maps = @()
                    if (Test-Path -LiteralPath $customJsonPath -PathType Leaf) {
                        $existingText = [System.IO.File]::ReadAllText($customJsonPath)
                        if (-not [string]::IsNullOrWhiteSpace($existingText)) {
                            $maps = @($existingText | ConvertFrom-Json)
                        }
                    }
                    $knownNumbers = @($maps | ForEach-Object { [int]$_.number })
                    Get-ChildItem -LiteralPath (Join-Path $projectRoot "Images") -File | ForEach-Object {
                        if ($_.BaseName -match '^(\d+)[^\d_]') {
                            $knownNumbers += [int]$matches[1]
                        }
                    }
                    $number = if ($knownNumbers.Count) {
                        ($knownNumbers | Measure-Object -Maximum).Maximum + 1
                    } else {
                        1
                    }
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
                    [System.IO.File]::WriteAllText($customJsonPath, $json, $utf8)
                    [System.IO.File]::WriteAllText(
                        $customJsPath,
                        "window.BlueFoxCustomMaps = $json;`n",
                        $utf8
                    )
                    $response = ConvertTo-Json @{
                        status = "saved"
                        id = $map["id"]
                        index = $index
                        number = $number
                    }
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
                        throw "Code de micro-scène invalide."
                    }
                    if ([string]::IsNullOrWhiteSpace([string]$template.name)) {
                        throw "Nom de micro-scène manquant."
                    }
                    $templateObjects = @($template.objects)
                    if ($templateObjects.Count -lt 1 -or $templateObjects.Count -gt 200) {
                        throw "Une micro-scène doit contenir entre 1 et 200 objets."
                    }
                    foreach ($entry in $templateObjects) {
                        if ([string]$entry.type -notmatch '^[a-z0-9_]+$') {
                            throw "Type d'objet invalide dans la micro-scène."
                        }
                        if (@($entry.offset).Count -ne 3 -or @($entry.rotation).Count -ne 3) {
                            throw "Transformation d'objet incomplète."
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
                    $templates = @($templates) + @($template)
                    $json = ConvertTo-Json -InputObject $templates -Depth 12
                    [System.IO.File]::WriteAllText($customJsonPath, $json, $utf8)
                    [System.IO.File]::WriteAllText(
                        $customJsPath,
                        "window.BlueFoxCustomMicroScenes = $json;`n",
                        $utf8
                    )

                    $response = ConvertTo-Json @{
                        status = "saved"
                        id = $uniqueId
                        count = $templateObjects.Count
                        total = $templates.Count
                    }
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
                "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
                "Connection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD" -and $body.Length -gt 0) {
                $stream.Write($body, 0, $body.Length)
            }
            $stream.Flush()
        } catch {
            Write-Warning $_.Exception.Message
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
