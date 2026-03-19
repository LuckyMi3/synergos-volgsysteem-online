# 02 — Quickstart (lokaal)

## Prereqs
- Node 18+ (liefst 20)
- PostgreSQL (lokaal of Neon)
- Prisma CLI (via dev deps)

## Install
```bash
npm install
```

## Environment
Gebruik **lokaal** een `.env.local` (niet committen). Minimale keys:

- `DATABASE_URL` (pooled)
- `ADMIN_COOKIE_SECRET` (random, lang)
- Optioneel:
  - `AUTH_COOKIE_SECRET` (als je user sessions los wil houden)
  - `DIRECT_URL` (direct connection voor migrations) — aanbevolen voor v2

> In v1 staat `directUrl` bewust uit in `schema.prisma` omdat `DIRECT_URL` niet altijd gezet was.

## Prisma (lokaal)
```bash
npx prisma generate
npx prisma migrate dev
```

### Handige commando’s
```bash
npx prisma studio
npx prisma db push
```

## Start dev server
```bash
npm run dev
```
Open:
- Home: `/`
- Student: `/student`
- Docent: `/docent`
- Admin: `/admin` (redirect naar `/admin/login`)

## “Ik krijg drift detected”
Dat betekent: DB schema ≠ migrations history.

**Aanpak lokaal (veilig):**
- Als je DB disposable is: reset `public` schema en migreer opnieuw.
- Als je DB productie is: **niet resetten**; maak migrations die de drift verklaren of align schema.

In v2 wil je dit oplossen door:
- `DIRECT_URL` te gebruiken
- een **clean migration baseline** te maken (zie 04-DATABASE-PRISMA.md)
