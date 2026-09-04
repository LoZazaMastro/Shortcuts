$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Root = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd("\")
$OutputDirectory = Split-Path -Parent $Root
$Version = (Get-Content (Join-Path $Root "package.json") -Raw | ConvertFrom-Json).version
$InstallerZip = Join-Path $OutputDirectory "Shortcuts-decky_Installer-$Version.zip"
$ProjectZip = Join-Path $OutputDirectory "Shortcuts-project-$Version.zip"

function New-PrefixedZip {
    param(
        [Parameter(Mandatory = $true)][string]$Destination,
        [Parameter(Mandatory = $true)][string]$Prefix,
        [Parameter(Mandatory = $true)][object[]]$Items,
        [string[]]$ExcludedRelativePrefixes = @()
    )

    $resolvedDestination = [IO.Path]::GetFullPath($Destination)
    if (-not ([IO.Path]::GetDirectoryName($resolvedDestination)).Equals($OutputDirectory, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to create a package outside the Shortcuts release directory."
    }
    if ([IO.File]::Exists($resolvedDestination)) {
        [IO.File]::Delete($resolvedDestination)
    }

    $archive = [IO.Compression.ZipFile]::Open($resolvedDestination, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($item in $Items) {
            $files = if ($item.PSIsContainer) {
                Get-ChildItem -LiteralPath $item.FullName -Recurse -File -Force
            } else {
                @($item)
            }
            foreach ($file in $files) {
                $relative = $file.FullName.Substring($Root.Length).TrimStart("\").Replace("\", "/")
                if ($ExcludedRelativePrefixes | Where-Object {
                    $relative.StartsWith($_, [StringComparison]::OrdinalIgnoreCase)
                }) {
                    continue
                }
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive,
                    $file.FullName,
                    "$Prefix/$relative",
                    [IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        }
    } finally {
        $archive.Dispose()
    }
}

$RuntimeNames = @(
    "assets", "dist", "LICENSES", "CHANGELOG.md", "LICENSE", "main.py",
    "package.json", "plugin.json", "README.md", "THIRD_PARTY_NOTICES.md"
)
$RuntimeItems = foreach ($name in $RuntimeNames) {
    Get-Item -LiteralPath (Join-Path $Root $name)
}
$ProjectItems = Get-ChildItem -LiteralPath $Root -Force | Where-Object {
    $_.Name -notin @(".git", "node_modules", "__pycache__")
}

New-PrefixedZip -Destination $InstallerZip -Prefix "shortcuts" -Items $RuntimeItems
New-PrefixedZip -Destination $ProjectZip -Prefix "shortcuts" -Items $ProjectItems `
    -ExcludedRelativePrefixes @("out/", "__pycache__/")

Write-Host "Created $InstallerZip"
Write-Host "Created $ProjectZip"
