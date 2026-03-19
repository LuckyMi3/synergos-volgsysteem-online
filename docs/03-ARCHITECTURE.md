# 03 — Architectuur (hoe alles samenhangt)

## Rollen (product)
- **STUDENT**: invullen meetmomenten + dossier inzien
- **TEACHER**: corrigeren per vraag + publicatie per assessment
- **ADMIN**: beheer, imports, unlocks, systeeminstellingen, meekijken

## Rollen (technisch, nu)
- Admin is “echt” afgeschermd via middleware + cookies.
- Student/Teacher is deels “mock/preview”, en deels via impersonation.

## Folderstructuur (Next.js App Router)
- `app/` UI routes + API routes (Route Handlers)
- `lib/` shared logic (prisma, auth, rubrics, profiles)
- `prisma/` schema
- `scripts/` helper scripts (imports e.d.)

## Datastromen in 1 zin
**Enrollment** koppelt User ↔ Cohort (procesgroep binnen uitvoering),  
**Assessment** is 1 per student+rubriek+moment,  
**Score** is studentinput per vraag,  
**TeacherScore/TeacherReview** is docentenlaag op dezelfde assessment.

## Concepten

### Uitvoering vs Cohort
- `Uitvoering` = schooljaar (bijv. “25/26”)
- `Cohort` = procesgroep binnen uitvoering (bijv. “1VO Procesgroep 2026”)
- `SystemSetting(CURRENT_UITVOERING_ID)` bepaalt welk schooljaar “huidig” is.

### Locking
Lock is nu: `Enrollment.assessmentLocked`  
Niet op `Assessment`.

**Impliceert:**
- lock werkt per student per cohort (dus per uitvoering/traject-context)
- bij meerdere rubrics/moments moet UI/route altijd via enrollment-context werken (v2 opschonen)

### Publicatie
- docent kan per assessment publiceren via `TeacherReview(status=PUBLISHED)`
- student kan inleveren via `Assessment.submittedAt`

## v2 richting: “één identiteit, één context”
In v2 willen we voor elke request weten:
- **wie** (userId)
- **rol** (role)
- **context** (currentUitvoeringId + enrollmentId)

Dan verdwijnen hardcoded ACTIVE_STUDENT_ID / mock roles.
