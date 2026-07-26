$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = $null
$port = 8765

foreach ($candidate in 8765..8780) {
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
    throw "Aucun port local disponible entre 8765 et 8780."
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

$url = "http://127.0.0.1:$port/index.html"
Write-Host ""
Write-Host "BlueFox Odyssey fonctionne en local sur :" -ForegroundColor Cyan
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
            while ($reader.ReadLine()) { }

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(" ")
            $method = $parts[0]
            $requestTarget = $parts[1].Split("?")[0]
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
            if (
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
