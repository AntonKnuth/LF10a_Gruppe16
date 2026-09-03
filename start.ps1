# Startet TravelKickers für die Vorführung: baut beide Frontends nach apps/api/wwwroot und
# startet den Server. Danach läuft alles unter einer Adresse, ohne CORS und ohne zweiten Prozess.
#
# Zum Entwickeln stattdessen drei Fenster:
#   apps/api        dotnet watch run
#   apps/web        npm run dev     (Port 5173)
#   apps/therapeut  npm run dev     (Port 5174)
# Beide Vite-Server leiten /api an den Server weiter, damit auch dort dieselbe Origin gilt.

$ErrorActionPreference = 'Stop'
$wurzel = $PSScriptRoot

# --- Voraussetzungen ---------------------------------------------------------------------
# Der häufigste Ausfall ist nicht ein Fehler im Code, sondern eine fehlende Runtime: das
# Projekt baut mit dem .NET-10-SDK anstandslos und startet dann nicht.

$runtimes = & dotnet --list-runtimes
$hatBasis = $runtimes | Select-String -SimpleMatch 'Microsoft.NETCore.App 8.'
$hatAspNet = $runtimes | Select-String -SimpleMatch 'Microsoft.AspNetCore.App 8.'

if (-not $hatBasis -or -not $hatAspNet) {
    Write-Host 'Es fehlt die .NET-8-Runtime. Beide Pakete werden gebraucht:' -ForegroundColor Red
    if (-not $hatBasis)  { Write-Host '  winget install Microsoft.DotNet.Runtime.8' }
    if (-not $hatAspNet) { Write-Host '  winget install Microsoft.DotNet.AspNetCore.8' }
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js wird zum Bauen der Frontends gebraucht.' -ForegroundColor Red
    exit 1
}

# --- Frontends bauen ---------------------------------------------------------------------

foreach ($app in @('web', 'therapeut')) {
    $pfad = Join-Path $wurzel "apps/$app"
    Write-Host "Baue apps/$app …" -ForegroundColor Cyan

    if (-not (Test-Path (Join-Path $pfad 'node_modules'))) {
        Push-Location $pfad; npm install; Pop-Location
    }

    Push-Location $pfad
    npm run build
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Host "apps/$app ließ sich nicht bauen." -ForegroundColor Red; exit 1 }
}

# --- Server starten ----------------------------------------------------------------------
# Arbeitsverzeichnis ausdrücklich setzen: die Datenbank hängt am Ausgabeordner, und ein
# falsches Arbeitsverzeichnis erzeugt still eine zweite, leere Datei.

Write-Host ''
Write-Host 'Kindmodus:          http://localhost:5099/' -ForegroundColor Green
Write-Host 'Therapeutenbereich: http://localhost:5099/therapeut/' -ForegroundColor Green
Write-Host 'Demo-Anmeldung:     thomas@praxis.test / travelkickers' -ForegroundColor DarkGray
Write-Host ''

Push-Location (Join-Path $wurzel 'apps/api')
dotnet run --no-launch-profile --urls http://localhost:5099
Pop-Location
