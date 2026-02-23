# Ayra App - Full Setup Guide (Fresh Laptop)

This guide is written for a laptop that has **no developer tools installed**. Follow each step in order.

---

## 0) What you will install

1. **Git** (to get the project code)
2. **Node.js LTS (v20.x)** (to run the app)
3. **Docker Desktop** (to run PostgreSQL database in Docker)
4. **Anvil (local blockchain)** via Docker (no Foundry install needed)

---

## Windows quick setup (script)

If you want to automate most of the setup on Windows, run this script.  
It will **ask for admin permission** (UAC prompt), install Git/Node/Docker, start Docker, and set up the project (DB + Anvil).

From **PowerShell (Run as Administrator)**:
```powershell
cd C:\\path\\to\\project\\ayra-app
Set-ExecutionPolicy Bypass -Scope Process -Force
./scripts/setup_windows.ps1
```

### One‑click option (double‑click)
You can also just double‑click:
```
scripts\\setup_windows.bat
```
This will open PowerShell, install everything, start Docker services, and launch the app in a new terminal.

The script will ask for the full path to your `ayra-app` folder and then run:
- `npm install`
- `docker compose up -d db anvil`
- `npx prisma migrate deploy`
- `npm run db:seed`

---

## Windows local setup (no Docker)

Use this if Docker cannot run (virtualization disabled). It installs **PostgreSQL locally** and runs Anvil locally.

Double‑click:
```
scripts\\setup_windows_local.bat
```

Notes:
- The PostgreSQL installer will ask for a **postgres superuser password**.  
  Use any password, but you will need to type it again during the script.
- Keep default port **5432** during the installer.
- This script creates a database named `ayra_local` and a user `ayra` with password `ayra_password`.
- `.env` already points to `postgresql://ayra:ayra_password@localhost:5432/ayra_local`.
- If Foundry install fails, the script will try Git Bash automatically. If it still fails, install manually from `https://foundry.paradigm.xyz`, then re-run the script.

The script will ask for the full path to your `ayra-app` folder, then:
- installs dependencies
- creates the database + user
- runs migrations + seed
- starts Anvil and launches the app automatically

---

## macOS (M1/M2) quick setup (Docker)

Double‑click:
```
scripts/setup_macos.command
```

This will install Homebrew (if missing), Git, Node.js LTS, Docker Desktop, start Docker, run migrations, seed data, and start the app.

You can also run it from Terminal:
```bash
cd /path/to/project/ayra-app
./scripts/setup_macos.sh
```

Notes:
- Docker Desktop will prompt for permission the first time; allow it.
- If Docker is still starting, the script will wait until it’s ready.

---

## 1) Install Git

Download and install Git:
- Windows: Git for Windows
- macOS: Xcode Command Line Tools or Git installer

Verify:
```bash
git --version
```

---

## 2) Install Node.js (LTS)

Install **Node.js LTS v20.x**.

Verify:
```bash
node -v
npm -v
```

---

## 3) Install Docker Desktop

Install Docker Desktop and make sure it is running.

Verify:
```bash
docker --version
docker compose version
```

---

## 5) Get the project code

If you received a ZIP file, extract it first.
If you received a Git repo, clone it:
```bash
git clone <REPO_URL>
```

Then go into the app folder (replace with your actual path):
```bash
cd /path/to/project/ayra-app
```

---

## 6) Install app dependencies

```bash
npm install
```

> Note: This project forces **Webpack** for `npm run dev` to avoid Turbopack crashes (we run `next dev --webpack`).

---

## 7) Start the database + blockchain (Docker)

This project uses **PostgreSQL + Anvil inside Docker**.

Start DB + Anvil containers:
```bash
docker compose up -d db anvil
```

Check it is running:
```bash
docker ps
```
You should see containers named `ayra_local_db` and `ayra_local_anvil`.

---

## 8) Ensure the app uses the Docker database (not local)

Open `.env` and make sure the `DATABASE_URL` is exactly:
```
DATABASE_URL="postgresql://ayra:ayra_password@localhost:5432/ayra_local?schema=public"
```

This points to the **Docker database** because Docker publishes port `5432` on localhost.

If the laptop already has local Postgres running, **stop it** so the Docker database is used.
If port 8545 is already used locally, stop the local blockchain or change the Anvil port in `docker-compose.yml` and `.env`.

Optional check using Docker (no local Postgres required):
```bash
docker exec -it ayra_local_db psql -U ayra -d ayra_local -c "SELECT version();"
```

---

## 8.1) Payment mode (demo vs on-chain)

This project supports a **hybrid demo**:
- **FIAT (default):** FPX / Visa / Mastercard are simulated, then the smart contract records the payment on-chain.
- **CRYPTO:** client funds the escrow directly on-chain.

Set in `.env`:
```
PAYMENT_MODE="FIAT"
```

---

## 9) Apply Prisma migrations

```bash
npx prisma migrate deploy
```

---

## 10) Seed demo data (creates demo users/projects)

```bash
npm run db:seed
```

---

## 11) Start the app

In the original terminal:
```bash
npm run dev
```

Open the app:
- http://localhost:3000/portal/login

---

## Demo login credentials

- Client: `client@ayra.local` / `Password123!`
- Designer: `designer@ayra.local` / `Password123!`
- Admin: `admin@ayra.local` / `Password123!`

---

## Optional blockchain checks

Smoke test escrow flow:
```bash
npm run chain:smoke
```

Index on-chain events into DB:
```bash
npm run chain:index
```

---

## Common issues

**1) Port 5432 already in use**
- Stop local PostgreSQL if installed.
- Or change ports in `docker-compose.yml` and `.env` together.

**2) Cannot connect to database**
- Ensure Docker Desktop is running.
- Run `docker compose up -d db`.

**3) Blockchain actions fail**
- Ensure Anvil container is running: `docker compose ps`

**4) Node version mismatch**
- Use Node.js **v20 LTS**.

---

## Stop everything

Stop the Next.js server:
```bash
Ctrl+C
```

Stop the database:
```bash
docker compose down
```

Stop Anvil:
```bash
Ctrl+C
```
