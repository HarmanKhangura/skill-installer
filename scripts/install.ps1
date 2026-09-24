param(
    [string]$Version = "latest"
)

$ErrorActionPreference = "Stop"
$repository = "HarmanKhangura/skill-installer"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is required. Install Node.js first: https://nodejs.org/"
}

if ($Version -eq "latest") {
    $downloadBase = "https://github.com/$repository/releases/latest/download"
}
else {
    $downloadBase = "https://github.com/$repository/releases/download/$Version"
}

$archive = Join-Path ([System.IO.Path]::GetTempPath()) "skill-installer-$([System.Guid]::NewGuid()).tgz"
$checksumFile = "$archive.sha256"

try {
    Invoke-WebRequest -Uri "$downloadBase/skill-installer.tgz" -OutFile $archive
    Invoke-WebRequest -Uri "$downloadBase/skill-installer.tgz.sha256" -OutFile $checksumFile

    $expectedChecksum = (Get-Content -Path $checksumFile -Raw).Split([char[]]" `t`r`n", [System.StringSplitOptions]::RemoveEmptyEntries)[0].ToLowerInvariant()
    $actualChecksum = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLowerInvariant()

    if ($expectedChecksum -ne $actualChecksum) {
        throw "Downloaded archive checksum does not match the release checksum."
    }

    npm install --global --ignore-scripts $archive
    if ($LASTEXITCODE -ne 0) {
        throw "npm could not install skill-installer."
    }

    skill-installer --version
    if ($LASTEXITCODE -ne 0) {
        throw "skill-installer could not be run after installation."
    }
}
finally {
    Remove-Item -Path $archive, $checksumFile -Force -ErrorAction SilentlyContinue
}
