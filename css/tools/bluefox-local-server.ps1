param(
    [string]$StartPage = "index.html",
    [string]$WindowTitle = "BlueFox Odyssey"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = $null
$port = 0

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
            if ($method -eq "POST" -and $decodedPath -eq "/api/custom-micro-scenes") {
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
                            $templates = @($existingText | ConvertFrom-Json)
                        }
                    }
                    $templates = @($templates | Where-Object { $_.id -ne $template.id }) + @($template)
                    $json = ConvertTo-Json -InputObject @($templates) -Depth 12
                    $utf8 = [System.Text.UTF8Encoding]::new($false)
                    [System.IO.File]::WriteAllText($customJsonPath, $json, $utf8)
                    [System.IO.File]::WriteAllText(
                        $customJsPath,
                        "window.BlueFoxCustomMicroScenes = $json;`n",
                        $utf8
                    )
                    $response = ConvertTo-Json @{ status = "saved"; id = $template.id; count = $templateObjects.Count }
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
