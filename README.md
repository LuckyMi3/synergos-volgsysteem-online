# Synergos Volgsysteem — V2 (work copy)

This is the **V2 work copy** of the Synergos Volgsysteem.

- V1 is kept as a separate archived folder/repo (do not edit).
- V2 introduces **Next.js route groups** to separate concerns without changing URLs.

## Quick start

1. Create `.env` from `.env.example`
2. Install deps

```bash
npm install
```

3. Prisma

```bash
npx prisma generate
# optional during local dev
npx prisma migrate dev
```

4. Run

```bash
npm run dev
```

## Docs

See `./docs/00-START-HIER.md` for the recommended reading order.
