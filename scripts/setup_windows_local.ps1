param(
  [switch]$AutoRun,
  [switch]$KeepOpen
)

$ErrorActionPreference = "Stop"
$script:ProjectPath = $null

function Write-Step($message) {
  Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Ensure-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) {
    Write-Host "This script needs Administrator permission. A UAC prompt will appear." -ForegroundColor Yellow
    $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($AutoRun) {
      $arguments += " -AutoRun"
    }
    Start-Process -FilePath "PowerShell.exe" -ArgumentList $arguments -Verb RunAs
    exit
  }
}

function Ensure-Winget {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget is not installed. Please install 'App Installer' from the Microsoft Store, then re-run this script." -ForegroundColor Red
    exit 1
  }
}

function Install-Packages {
  Write-Step "Installing Git, Node.js LTS, PostgreSQL, and Foundry"
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  winget install --id PostgreSQL.PostgreSQL -e --accept-package-agreements --accept-source-agreements

  if (-not (Get-Command anvil -ErrorAction SilentlyContinue)) {
    Write-Step "Installing Foundry (Anvil)"
    $foundryInstalled = $false

    try {
      winget install --id Foundry-rs.Foundry -e --accept-package-agreements --accept-source-agreements
      if (Get-Command anvil -ErrorAction SilentlyContinue) {
        $foundryInstalled = $true
      }
    } catch {
      Write-Host "winget failed to install Foundry. Trying Git Bash install..." -ForegroundColor Yellow
    }

    if (-not $foundryInstalled) {
      $gitBashPaths = @(
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe"
      )
      $gitBash = $gitBashPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

      if (-not $gitBash) {
        throw "Found Git but could not find Git Bash. Please open https://foundry.paradigm.xyz and install Foundry manually, then re-run this script."
      }

      & $gitBash -lc "curl -L https://foundry.paradigm.xyz | bash"
      & $gitBash -lc "~/.foundry/bin/foundryup"

      $foundryBin = Join-Path $env:USERPROFILE ".foundry\\bin"
      if (Test-Path $foundryBin) {
        $env:Path = "$foundryBin;$env:Path"
      }

      if (Get-Command anvil -ErrorAction SilentlyContinue) {
        $foundryInstalled = $true
      }
    }

    if (-not $foundryInstalled) {
      throw "Foundry install failed. Please open https://foundry.paradigm.xyz in a browser and follow the Windows install steps, then re-run this script."
    }
  }
}

function Start-PostgresService {
  $service = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1
  if ($service -and $service.Status -ne "Running") {
    Write-Step "Starting PostgreSQL service"
    Start-Service $service.Name
  }
}

function Add-Postgres-ToPath {
  $pgRoot = "C:\Program Files\PostgreSQL"
  if (-not (Test-Path $pgRoot)) {
    return $false
  }
  $latest = Get-ChildItem $pgRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $latest) {
    return $false
  }
  $binPath = Join-Path $latest.FullName "bin"
  if (-not (Test-Path $binPath)) {
    return $false
  }
  $env:Path = "$binPath;$env:Path"
  return $true
}

function Setup-Postgres {
  Write-Step "Configuring local PostgreSQL"
  if (-not (Add-Postgres-ToPath)) {
    Write-Host "PostgreSQL was installed but psql was not found. Please add PostgreSQL bin to PATH and re-run." -ForegroundColor Red
    exit 1
  }

  $pgPasswordSecure = Read-Host "Enter the postgres superuser password you set during installation" -AsSecureString
  $pgPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPasswordSecure))
  $env:PGPASSWORD = $pgPassword

  $userExists = psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='ayra';"
  if (-not $userExists) {
    psql -U postgres -c "CREATE USER ayra WITH PASSWORD 'ayra_password';"
  }

  $dbExists = psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='ayra_local';"
  if (-not $dbExists) {
    psql -U postgres -c "CREATE DATABASE ayra_local OWNER ayra;"
  }

  Remove-Item Env:PGPASSWORD
}

function Setup-Project {
  Write-Step "Project setup"
  $projectPathInput = Read-Host "Enter full path to the ayra-app folder (e.g. C:\Users\User\Downloads\ayra-app\ayra-app)"
  if (-not (Test-Path $projectPathInput)) {
    Write-Host "Path not found. Please re-run and enter the correct path." -ForegroundColor Red
    exit 1
  }

  Set-Location $projectPathInput
  $script:ProjectPath = (Get-Location).Path

  if (-not (Test-Path ".env")) {
    Write-Host ".env not found. Please ensure you are in the ayra-app folder." -ForegroundColor Red
    exit 1
  }

  Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
  npm install

  Write-Host "Applying Prisma migrations..." -ForegroundColor Cyan
  npx prisma migrate deploy

  Write-Host "Seeding demo data..." -ForegroundColor Cyan
  npm run db:seed
}

function Final-Instructions {
  Write-Step "Next steps"
  Write-Host "1) Start Anvil in a new terminal:" -ForegroundColor Yellow
  Write-Host "   anvil --chain-id 31337 --port 8545"
  Write-Host "2) Start the app in another terminal:" -ForegroundColor Yellow
  Write-Host "   npm run dev"
  Write-Host "3) Open http://localhost:3000/portal/login" -ForegroundColor Yellow
}

try {
  $logPath = Join-Path $PSScriptRoot "setup_windows_local.log"
  Start-Transcript -Path $logPath -Append | Out-Null

  Ensure-Admin
  Ensure-Winget
  Install-Packages
  Start-PostgresService
  Setup-Postgres
  Setup-Project

  if ($AutoRun -and $script:ProjectPath) {
    Write-Step "Launching local chain + app"
    Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoExit", "-Command", "anvil --chain-id 31337 --port 8545"
    Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$script:ProjectPath`"; npm run dev"
    Start-Process "http://localhost:3000/portal/login"
  } else {
    Final-Instructions
  }
  if ($KeepOpen -or -not $PSBoundParameters.ContainsKey("KeepOpen")) {
    Read-Host "Press Enter to close"
  }
} catch {
  Write-Host \"`nERROR: $($_.Exception.Message)\" -ForegroundColor Red
  Write-Host \"Log saved to: $logPath\" -ForegroundColor Yellow
  Read-Host \"Press Enter to close\"
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
