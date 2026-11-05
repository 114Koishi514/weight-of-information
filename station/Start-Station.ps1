$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Drawing
    $printerNames = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)
    if ($printerNames.Count -eq 0) { throw 'No Windows printer queues were found. Install the NETUM driver and print a Windows test page first.' }
    Write-Host ''
    Write-Host 'THE WEIGHT OF INFORMATION' -ForegroundColor White
    Write-Host 'Automatic receipt station / Windows / NETUM NT-1809'
    Write-Host ''
    for ($i = 0; $i -lt $printerNames.Count; $i++) { Write-Host ('[{0}] {1}' -f ($i + 1), $printerNames[$i]) }
    Write-Host ''
    $selected = Read-Host 'Enter the number of your NETUM / 58 mm receipt printer'
    $index = 0
    if (-not [int]::TryParse($selected, [ref]$index) -or $index -lt 1 -or $index -gt $printerNames.Count) { throw 'Invalid printer number. Restart and choose a listed printer.' }
    $selectedPrinter = $printerNames[$index - 1]
    if ($selectedPrinter -match '(?i)Microsoft Print to PDF|XPS|OneNote|Fax') { throw 'Select the physical NETUM receipt printer, not a document or virtual printer.' }
    Add-Type -Path (Join-Path $PSScriptRoot 'Station.cs') -ReferencedAssemblies 'System.dll','System.Core.dll','System.Drawing.dll','System.Web.Extensions.dll'
    $webRoot = Join-Path $PSScriptRoot 'www'
    if (-not (Test-Path (Join-Path $webRoot 'index.html'))) { throw 'Website files are missing. Extract the entire ZIP before running START_STATION.cmd.' }
    Write-Host ('Printer queue: ' + $selectedPrinter)
    Write-Host 'Opening http://127.0.0.1:8765/ ...'
    Write-Host 'Keep this window open. Use TEST PRINT once before participants begin.'
    Write-Host 'Close this window to stop the station.'
    [InformationStation.Server]::Run($webRoot, $selectedPrinter, (Join-Path $PSScriptRoot 'station-state'))
} catch {
    Write-Host ''
    Write-Host ('Station could not continue: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'If port 8765 is already in use, close the other station window first.'
    exit 1
}
