# 07 — API Routes (contracten)

> Dit document is bedoeld als “wat kan ik aanroepen en wat krijg ik terug”.

## Publieke API (student/docent)
- `GET /api/me` — current user (status: in opbouw)
- `GET /api/cohorts` — cohorts voor gebruiker / of publiek (afhankelijk implementatie)
- `GET /api/students` — (status: intern)
- `GET /api/assessments` — lijst / current
- `POST /api/assessments/ensure` — maak assessment aan als ontbreekt
- `GET /api/assessments/[assessmentId]` — detail
- `POST /api/assessments/[assessmentId]/submit` — set submittedAt
- `POST /api/assessments/[assessmentId]/unlock` — (admin/teacher?) unlock assessment
- `POST /api/score` — upsert single score
- `GET /api/scores` — batch fetch scores
- `GET/POST /api/teacher-scores` — docentcorrecties
- `GET/POST /api/teacher-reviews` — docent review + publish flow

## Admin API
Alle admin endpoints hangen onder `/api/admin/*` en vallen onder middleware auth.

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/cohorts`
- `GET /api/admin/credentials`
- `POST /api/admin/import/users`
- `POST /api/admin/impersonate/start`
- `POST /api/admin/impersonate/stop`
- `GET/POST /api/admin/system/current-uitvoering`
- `GET /api/admin/assessments-data`
- `POST /api/admin/enrollments/[id]/unlock`
- `POST /api/admin/student-credential`

## v2 afspraak: consistent response envelope
Voor nieuwe endpoints gebruiken we bij voorkeur:
```ts
{ ok: true, data: ... }
{ ok: false, error: { code, message } }
```
Zodat UI’s uniforme error handling hebben.
