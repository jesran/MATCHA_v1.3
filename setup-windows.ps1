$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Log([string]$message) {
    Write-Host $message
}

function Test-Command([string]$name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
    Log ""
    Log "Installing Node.js and Python with winget..."
    winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
    winget install --id Python.Python.3.12 --exact --accept-package-agreements --accept-source-agreements
}

function Install-WithChoco {
    Log ""
    Log "Installing Node.js and Python with Chocolatey..."
    choco install nodejs-lts python -y
}

function Install-WithScoop {
    Log ""
    Log "Installing Node.js and Python with Scoop..."
    scoop install nodejs-lts python
}

function Install-Prerequisites {
    if (Test-Command "winget") {
        Install-WithWinget
        return
    }

    if (Test-Command "choco") {
        Install-WithChoco
        return
    }

    if (Test-Command "scoop") {
        Install-WithScoop
        return
    }

    Log ""
    Log "No supported Windows package manager was found."
    Log "Install Node.js LTS and Python 3 manually, then rerun this script."
    exit 1
}

Log "Starting Matcha Windows setup..."

if (-not (Test-Command "node") -or -not (Test-Command "npm") -or (-not (Test-Command "python") -and -not (Test-Command "py"))) {
    Install-Prerequisites
}

if (-not (Test-Command "node") -or -not (Test-Command "npm") -or (-not (Test-Command "python") -and -not (Test-Command "py"))) {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

if (-not (Test-Command "node") -or -not (Test-Command "npm") -or (-not (Test-Command "python") -and -not (Test-Command "py"))) {
    Log ""
    Log "One or more required tools are still missing after installation."
    Log "Open a new PowerShell window and rerun this script."
    exit 1
}

Log ""
Log "System prerequisites are ready."
Log "Running setup.js..."
Log ""

node .\setup.js
