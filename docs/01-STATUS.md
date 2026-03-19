# 01 — Status (v1.42 → startpunt v2)

## Wat er nu staat (v1.42)
- **Student view:** invullen per meetmoment werkt (scores + commentaar) en kan **inleveren** (`submittedAt`).
- **Docent view:** docent kan scores/feedback toevoegen en publiceren (TeacherScore/TeacherReview).
- **Admin basis:** dashboards, lijsten, “meekijken/impersonation” knoppen, systeeminstelling pagina.
- **Systeeminstellingen:** `CURRENT_UITVOERING_ID` kan gelezen/geschreven worden.
- **Deploy:** Vercel pipeline is stabiel zolang je **geen migrations** in build doet.

## Wat bewust nog “tijdelijk” is
- **Auth:** admin login bestaat, maar student/docent is nog grotendeels mock/preview.
- **Profiles/diagrammen:** `computeProfiles()` is dummy-data en moet later gevoed worden vanuit echte scores.
- **Terminologie:** in UI wordt “Cohorts” feitelijk gebruikt voor “Uitvoeringen/Procesgroepen” (nog hernoemen).

## Bekende aandachtspunten
- **DB drift:** `Uitvoering` bestaat in DB en is in schema opgenomen. Migratiegeschiedenis kan achterlopen → lokaal voorzichtig.
- **CRM data issues:** email duplicatie / inconsistenties kunnen import frustreren.
- **Route naming:** gebruik alleen standaard ASCII hyphens in mappen/paths (geen “speciale” streepjes).

## v2: definitie van “schone start”
Schone start betekent **niet** dat we alles weggooien, maar dat we:
1. alles wat nu “impliciet” is expliciet maken (docs + conventions),
2. technische schuld gericht oplossen (auth, naming, imports),
3. uitbreiden op rubrics/uitvoeringen zonder spaghetti.

## Directe v2-prioriteiten (de volgorde)
1. **Auth & identiteit** (één `GET /api/me` waarheid + admin impersonation daarop)
2. **Uitvoering/Cohort nomenclatuur** (system-wide “Uitvoering”/“Procesgroep” consistent)
3. **Imports V1** (eerst studenten + enrollment, dan docenten)
4. **Admin Unlock tool** af (submittedAt reset + locks consistent)
5. **Diagram UI** (kleuren/legenda/actief-inactief; dropdowns boven radar)
