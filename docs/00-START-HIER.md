# Synergos Volgsysteem — Docs v2 (schone start)

Datum: 2026-03-04  
Doel: één duidelijke set docs waarmee je **zonder context** weer kunt instappen en doorontwikkelen.

> Deze docs beschrijven **de huidige codebasis (v1.42)** als vertrekpunt en leggen daar bovenop de **v2-richting** vast: wat blijft, wat moet eruit, wat bouwen we als eerst.

## In 3 minuten weer draaien (TL;DR)

1. Installeer dependencies
   - `npm install`
2. Zet `.env.local` (kopieer uit `.env`, maar **geen secrets committen**)
3. Prisma
   - `npx prisma generate`
   - `npx prisma migrate dev` *(alleen lokaal)*  
4. Start
   - `npm run dev`
5. Admin
   - Ga naar `/admin/login`

## Documenten (leesvolgorde)

1. **01-STATUS.md** – wat werkt, wat is “known broken”, wat is prioriteit
2. **02-QUICKSTART.md** – setup, env vars, prisma, lokaal draaien
3. **03-ARCHITECTURE.md** – hoe alles in elkaar grijpt (rollen/data/flow)
4. **04-DATABASE-PRISMA.md** – datamodel, drift, migratiebeleid
5. **05-AUTH-IMPERSONATION.md** – admin login + meekijken + mock/SSO plan
6. **06-RUBRICS.md** – rubric definities, schaal, hoe toevoegen
7. **07-API-ROUTES.md** – API contracten per endpoint (admin + publiek)
8. **08-UI-PAGES.md** – welke pagina waar zit, en welke rol wat ziet
9. **09-ADMIN-TOOLS.md** – unlock, import, systeeminstellingen
10. **10-DEPLOYMENT.md** – Vercel + env + migraties
11. **11-ROADMAP-V2.md** – v2 “contract”: wat we gaan bouwen, in volgorde
12. **12-CONVENTIONS.md** – afspraken: naming, PR’s, checks, debug

## Kernprincipe voor v2
- **Geen losse geheugenkennis nodig:** alles wat je “even moet weten” staat óf in codecomment, óf in deze docs.
- **Geen migraties in Vercel build:** schema changes zijn bewust en gecontroleerd.
- **Eén waarheid voor ‘huidige uitvoering’** via `SystemSetting.CURRENT_UITVOERING_ID`.
