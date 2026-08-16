$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[1/3] Building the Windows x64 Electron layout..."
npm run package:win

$packageDir = Join-Path $root "out\ZQTextSandbox8F4K2-win32-x64"
$manifestSource = Join-Path $root "Package.appxmanifest"
$manifestTarget = Join-Path $root "out\Package.appxmanifest"

if (!(Test-Path $packageDir)) { throw "Packaged Electron folder was not created: $packageDir" }
if (!(Test-Path $manifestSource)) { throw "Package.appxmanifest was not found." }

Write-Host "[2/3] Applying the Partner Center identity values..."
$manifest = Get-Content $manifestSource -Raw
$identityName = if ($env:STORE_IDENTITY_NAME) { $env:STORE_IDENTITY_NAME } else { "38959708.ZQTextSandbox8F4K2" }
$publisher = if ($env:STORE_PUBLISHER) { $env:STORE_PUBLISHER } else { "CN=C6CECE36-E415-4146-A175-E0B24E2A5BE2" }
$publisherDisplayName = if ($env:STORE_PUBLISHER_DISPLAY_NAME) { $env:STORE_PUBLISHER_DISPLAY_NAME } else { "罗运来" }
$manifest = $manifest.Replace("YOUR_STORE_IDENTITY_NAME", $identityName)
$manifest = $manifest.Replace("CN=YOUR_STORE_PUBLISHER", $publisher)
$manifest = $manifest.Replace("YOUR_PUBLISHER_DISPLAY_NAME", $publisherDisplayName)
New-Item -ItemType Directory -Force (Split-Path $manifestTarget) | Out-Null
Set-Content -Path $manifestTarget -Value $manifest -Encoding utf8

Write-Host "[3/3] Creating MSIX with Microsoft's winapp CLI..."
$certArgs = @()
if ($env:SIGN_MSIX -eq "true") {
  if (!(Test-Path (Join-Path $root "devcert.pfx"))) {
    throw "SIGN_MSIX=true but devcert.pfx was not found. Run: npx winapp cert generate"
  }
  $certArgs = @("--cert", (Join-Path $root "devcert.pfx"))
}

& npx winapp pack $packageDir --output (Join-Path $root "out") --manifest $manifestTarget @certArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$msix = Get-ChildItem -Path (Join-Path $root "out") -Filter "*.msix" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if ($msix) {
  $uploadZip = Join-Path $env:TEMP "$($msix.BaseName)-upload.zip"
  $uploadFile = Join-Path $root "out\$($msix.BaseName).msixupload"
  Remove-Item $uploadZip -Force -ErrorAction SilentlyContinue
  Remove-Item $uploadFile -Force -ErrorAction SilentlyContinue
  Compress-Archive -Path $msix.FullName -DestinationPath $uploadZip -Force
  Move-Item $uploadZip $uploadFile -Force
  Write-Host "Store upload file: $uploadFile"
}
Write-Host "MSIX output is in: $root\out"
