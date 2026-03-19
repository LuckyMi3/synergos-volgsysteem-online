# 04 — Database & Prisma

## Datasource
- PostgreSQL (Neon)
- `DATABASE_URL` = pooled verbinding
- (v2 aanbevolen) `DIRECT_URL` = direct verbinding voor migrations

## Kernmodellen (mentaal model)
- **User**: persoon + role + (optioneel) passwordHash
- **Uitvoering**: schooljaar “25/26”
- **Cohort**: procesgroep binnen uitvoering
- **Enrollment**: koppeling user↔cohort + lock
- **Assessment**: (studentId, rubricKey, moment) uniek
- **Score**: student score per theme+question
- **TeacherScore**: docentcorrecties per vraag (per docent)
- **TeacherReview**: publicatie “gate” per assessment (per docent)
- **StudentCredential**: tentamens/MBK/PSBK + praktijkvorming tellers
- **SystemSetting**: key/value settings (nu: CURRENT_UITVOERING_ID)

## Drift (belangrijk)
Er is eerder drift geconstateerd: `Uitvoering` table bestond al in DB.  
Daarom staat `Uitvoering` expliciet in schema.

**v2-doel:** één nette migration baseline, zodat:
- local dev altijd `migrate dev` kan doen zonder resets
- productie migrations gecontroleerd kunnen draaien

Aanpak (suggestie):
1. Maak een “baseline” migration die exact matcht met productie schema.
2. Zet `directUrl` aan in `schema.prisma` en voeg `DIRECT_URL` toe in env.
3. Spreek af: schema wijziging = migration (niet db push) voor alles behalve lokaal experiment.

## Commands cheat sheet
```bash
npx prisma generate
npx prisma studio

# Lokaal migreren
npx prisma migrate dev -n <name>

# Productie migreren (bewust handmatig)
npx prisma migrate deploy
```

## Indices & uniqueness (waar het vaak misgaat)
- `Enrollment`: unique(userId, cohortId)
- `Assessment`: unique(studentId, rubricKey, moment)
- `Score`: unique(assessmentId, themeId, questionId)
- `TeacherScore`: unique(assessmentId, teacherId, themeId, questionId)
- `TeacherReview`: unique(assessmentId, teacherId)
- `Cohort`: unique(uitvoeringId, naam)
