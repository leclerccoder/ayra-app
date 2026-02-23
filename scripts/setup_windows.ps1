param(
  [switch]$AutoRun
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
  Write-Step "Installing Git, Node.js LTS, and Docker Desktop"
  winget install --id Git.Git -e --accept-package-agreements --accept-source-agreements
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
}

function Start-Docker {
  Write-Step "Starting Docker Desktop"
  $dockerExe = "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerExe) {
    Start-Process -FilePath $dockerExe | Out-Null
  }

  Write-Host "Waiting for Docker to be ready..." -ForegroundColor Yellow
  for ($i = 0; $i -lt 30; $i++) {
    try {
      docker info | Out-Null
      Write-Host "Docker is ready." -ForegroundColor Green
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  Write-Host "Docker did not become ready in time. Please open Docker Desktop manually and re-run this script." -ForegroundColor Red
  exit 1
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

  Write-Host "Starting PostgreSQL + Anvil (Docker)..." -ForegroundColor Cyan
  docker compose up -d db anvil

  Write-Host "Applying Prisma migrations..." -ForegroundColor Cyan
  npx prisma migrate deploy

  Write-Host "Seeding demo data..." -ForegroundColor Cyan
  npm run db:seed
}

function Final-Instructions {
  Write-Step "Next steps"
  Write-Host "1) Start the app in a new terminal:" -ForegroundColor Yellow
  Write-Host "   npm run dev"
  Write-Host "2) Open http://localhost:3000/portal/login" -ForegroundColor Yellow
}

Ensure-Admin
Ensure-Winget
Install-Packages
Start-Docker
Setup-Project
if ($AutoRun -and $script:ProjectPath) {
  Write-Step "Launching app"
  Start-Process -FilePath "PowerShell.exe" -ArgumentList "-NoExit", "-Command", "cd `"$script:ProjectPath`"; npm run dev"
  Start-Process "http://localhost:3000/portal/login"
} else {
  Final-Instructions
}
