# 12 — Conventions (afspraken)

## Code delivery (Nick-proof)
- Bij codewijzigingen: **altijd het hele bestand** leveren (copy/paste safe).
- Geen “knip hier” snippets.

## Naming
- `Uitvoering.id` = `"25/26"` format (string)
- `Cohort.naam` = menselijk (“1VO Procesgroep 2026”)
- `rubricKey` = lowercase key (`1vo`, `2vo`)

## API
- responses in `{ ok, data }` envelope voor nieuwe routes
- fouten: `{ ok:false, error:{ code, message } }`

## UI
- Geen “holistisch” in copy/labels
- Admin pages blijven onder middleware
- Student/Teacher UX moet zonder admin-kennis te gebruiken zijn

## Debug
- Log pas aanzetten in Prisma client als nodig
- Route names alleen ASCII; nooit “rare” hyphen
