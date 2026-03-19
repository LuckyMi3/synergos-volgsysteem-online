# 09 — Admin tools (unlock, imports, systeem)

## System setting: CURRENT_UITVOERING_ID
Doel: UI kan schooljaar wisselen zonder code deploy.

- UI: `/admin/system`
- API: `/api/admin/system/current-uitvoering` (GET/POST)

## Unlock (v2 definitie)
We onderscheiden 2 unlocks:

1) **Assessment unlock** (student mag weer editen)
- `Assessment.submittedAt = null`

2) **Enrollment lock** (systeemlock)
- `Enrollment.assessmentLocked = false`

Tool moet beide kunnen tonen en (met expliciete keuze) resetten.

## Import (v2 V1 scope)
Eerst: **Users + Cohorts + Enrollments**.
Daarna: **rollen** (docent vs student) en credentials.

### Import regels (hard)
- `crmCustomerId` is unieke sleutel
- email is niet betrouwbaar uniek (CRM issues)
- cohort uniek binnen uitvoering via `(uitvoeringId, naam)`

### Aanpak
- Import endpoint idempotent (upsert)
- Dry-run mode (later) voor diff preview
