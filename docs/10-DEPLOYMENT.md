# 10 — Deployment (Vercel)

## Principes
- Build = `next build`
- Prisma generate via `postinstall`
- **Geen migrations** automatisch in build pipeline

## Env vars in Vercel
- `DATABASE_URL`
- `ADMIN_COOKIE_SECRET`
- (v2) `DIRECT_URL` + `AUTH_COOKIE_SECRET`

## Migraties in productie
Handmatig, bewust:
```bash
npx prisma migrate deploy
```

## Release checklist (v2)
1. `npm run build` lokaal groen
2. Prisma schema wijziging? → migration bestaat en getest
3. Admin login werkt
4. Impersonation banner zichtbaar wanneer actief
5. Student submit/unlock flows getest op demo user
