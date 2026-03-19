# 08 — UI Pages (waar zit wat)

## Public
- `/` – landing
- `/sso` – placeholder/route voor toekomstige SSO
- `/auth/callback` – callback placeholder

## Student
- `/student` – dashboard
- `/student/volgsysteem` – invullen meetmomenten (wrapper + client component)

## Docent
- `/docent` – docent dashboard

## Admin
- `/admin` – admin dashboard
- `/admin/login` – login
- `/admin/users` – users
- `/admin/students` – studentenlijst / studentkaart
- `/admin/teachers` – docentenlijst
- `/admin/cohorts` – cohorts/uitvoeringen beheer
- `/admin/assessments` – assessment overzicht
- `/admin/reviews` – reviews overzicht
- `/admin/credentials` – bekwaamheidsstatus (tentamens/MBK/PSBK/praktijkvorming)
- `/admin/system` – systeeminstellingen (CURRENT_UITVOERING_ID)
- `/admin/tools` – tools pagina (unlock/import placeholders)
- `/admin/locks` – locks overzicht

## v2 UX-afspraken (kort)
- Dropdowns/extra info boven radar (niet eronder)
- Legenda = kleuren van blobs (actief/inactief per gekozen view)
- Geen “onzin legenda” tekst; kleur + label uit rubric/profiel mapping
