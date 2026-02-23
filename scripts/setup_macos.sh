#!/bin/bash
set -euo pipefail

step() {
  echo ""
  echo "=== $1 ==="
}

if ! command -v brew >/dev/null 2>&1; then
  step "Installing Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

step "Installing Git, Node.js LTS"
brew install git
brew install node@20

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed. Please install Docker Desktop, then re-run this script."
  exit 1
fi

step "Starting Docker Desktop"
open -a Docker

# Wait for Docker to be ready
for i in {1..60}; do
  if docker info >/dev/null 2>&1; then
    echo "Docker is ready."
    break
  fi
  echo "Waiting for Docker..."
  sleep 2
  if [[ $i -eq 60 ]]; then
    echo "Docker did not become ready in time. Open Docker Desktop manually and re-run the script."
    exit 1
  fi
done

step "Project setup"
read -r -p "Enter full path to the ayra-app folder (e.g. /Users/you/Downloads/ayra-app/ayra-app): " PROJECT_PATH
if [[ ! -d "$PROJECT_PATH" ]]; then
  echo "Path not found. Please re-run and enter the correct path."
  exit 1
fi

cd "$PROJECT_PATH"

if [[ ! -f .env ]]; then
  echo ".env not found. Please ensure you are in the ayra-app folder."
  exit 1
fi

npm install

docker compose up -d db anvil

npx prisma migrate deploy
npm run db:seed

step "Launching app"
# Open new Terminal for dev server
osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$PROJECT_PATH\" && npm run dev"
end tell
EOF

open "http://localhost:3000/portal/login"

echo "Done. If you see any errors, copy them and send back." 
