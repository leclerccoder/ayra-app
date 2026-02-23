# Database Backups

This folder contains PostgreSQL SQL dumps from the local Docker DB (`ayra_local_db`).

## Restore On Another Laptop

1. Start Docker services:

```powershell
docker compose up -d
```

2. Restore a backup (example uses latest dump):

```powershell
Get-Content "backups/ayra_local_20260224-001002.sql" | docker exec -i ayra_local_db psql -U ayra -d ayra_local
```

3. Verify:

```powershell
docker exec ayra_local_db psql -U ayra -d ayra_local -c "SELECT COUNT(*) FROM \"Project\";"
```

