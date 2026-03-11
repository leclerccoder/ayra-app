# Ayra App

Ayra is a local-first final year project prototype built with Next.js, Prisma, PostgreSQL, and a local Anvil blockchain. The app mixes a traditional portal workflow with blockchain-backed escrow events:

- portal users: `CLIENT`, `DESIGNER`, `ADMIN`
- features: enquiries, projects, draft uploads, disputes, notifications, and receipts
- auth flow: password login, session cookies, email verification, password reset, and email MFA codes
- payment model: mock `FPX` and card flows for local demo purposes
- blockchain model: local wallets, escrow contract actions, and draft proof anchoring on Anvil

## Local Docker Stack

Docker is only used for local infrastructure:

- `db`: PostgreSQL 16 on `localhost:5433`
- `anvil`: local blockchain RPC on `localhost:8545`

The Next.js frontend/backend should run directly on your machine with `npm run dev`.

### Start Infrastructure

```bash
docker compose up -d
```

Then start the app locally:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Then use:

- app: [http://localhost:3000](http://localhost:3000)
- postgres: `localhost:5433`
- anvil RPC: `http://localhost:8545`

If you want demo records on a fresh database, run:

```bash
npm run db:seed
npm run demo:scenarios
```

### Demo Data

On a fresh database, the demo seed creates portal records and users. The seed password is defined in `prisma/seed.js` as:

```text
Password123!
```

Seeded emails:

- `admin@ayra.local`
- `designer@ayra.local`
- `client@ayra.local`

### Reset the Stack

```bash
docker compose down -v
docker compose up -d
```

That removes the Postgres and Anvil volumes and recreates the local infrastructure from scratch. You can then rerun `npm run db:seed` and `npm run demo:scenarios`.

## Architecture Notes

For this repository as it stands today:

- the payment layer is a simulated local flow, not a real bank or card gateway
- the blockchain layer is real in the sense that it talks to a local Anvil chain and records escrow actions there
- the application itself is expected to run locally, while Postgres and Anvil run in Docker

This is a good fit for local development and FYP presentation, but it should still be presented as a prototype rather than a production payment platform.
