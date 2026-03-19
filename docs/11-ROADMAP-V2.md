# 11 — Roadmap v2 (wat we gaan bouwen)

## v2-0: housekeeping (1 sessie)
- [ ] Supabase dependency eruit (als ongebruikt)
- [ ] `currentUser.ts` mock eruit of achter feature flag
- [ ] Terminologie: “Cohort” UI label → “Procesgroep” (en “Uitvoering” waar nodig)

## v2-1: identiteit & context (kern)
- [ ] `GET /api/me` als enige waarheid
- [ ] Student/Docent pages gebruiken effectieve user (incl. impersonation)
- [ ] Enrollment context: selecteer cohort binnen CURRENT_UITVOERING_ID
- [ ] Audit-friendly structuur (nog geen logging nodig)

## v2-2: imports V1
- [ ] CSV upload → upsert Users
- [ ] Upsert Uitvoering + Cohort + Enrollment
- [ ] Result screen: created/updated counts + warnings

## v2-3: admin unlock tool
- [ ] overzicht “ingeleverd”
- [ ] unlock assessment (submittedAt null)
- [ ] unlock enrollment (assessmentLocked false)
- [ ] guardrails (confirm, log reason)

## v2-4: diagram UI
- [ ] radar raster rond
- [ ] indicatielijnen niveaus
- [ ] dropdowns boven radar
- [ ] legenda op basis van blobs (actief/inactief)
