# Vercel Deployment

This project can run on Vercel without Docker by using:

- Vercel for the Next.js app
- Hosted PostgreSQL for `DATABASE_URL`
- `FILE_STORAGE_DRIVER=database` for uploaded files
- `CHAIN_MODE=mock` for the lecturer demo escrow/blockchain flow

Required production environment variables:

```env
DATABASE_URL=postgresql://...
APP_URL=https://your-project.vercel.app
FILE_STORAGE_DRIVER=database
CHAIN_MODE=mock
CHAIN_ID=31337
PAYMENT_MODE=FIAT
ADMIN_MFA_CODE=123456
```

The Vercel build command runs:

```bash
npm run vercel-build
```

That command generates Prisma Client, applies migrations, and builds Next.js.

After the first deployment, seed demo accounts against the hosted database:

```bash
FILE_STORAGE_DRIVER=database DATABASE_URL="postgresql://..." npm run db:seed
```

Demo credentials:

```text
admin@ayra.local / Password123!
designer@ayra.local / Password123!
client@ayra.local / Password123!
```
