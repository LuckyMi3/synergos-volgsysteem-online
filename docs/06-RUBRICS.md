# 06 — Rubrics

## Wat is een rubric in deze codebase
Een rubric is een **TypeScript definitie** met:
- key/id (bijv. `1vo`, `2vo`)
- title
- scale (min/max/labels)
- themes[] met questions[]

De UI leest dit en rendert sliders/inputs dynamisch.

## Bestaande rubrics
- `basisjaar`
- `1vo`
- `2vo` (jaar 2)
- `3vo`
- plus: ontwikkelprofiel / vaardigheidsprofiel (radar/diagrammen)

### 2VO bron
De 2VO rubric is overgenomen uit het beoordelingsformulier “Beoordelingsformulier Vakopleiding Haptonomie – Jaar 2 (2VO)”. {"(zie bron in project)"}  

## RubricKey afspraken
- altijd lowercase
- geen spaties
- versie in bestand als metadata (bijv. `version: "2026-02-25"`)

## Nieuwe rubric toevoegen (v2 workflow)
1. Maak bestand: `lib/rubrics/<key>.ts`
2. Voeg toe aan `lib/rubrics/index.ts`
3. Zorg dat UI routes (student/docent) rubricKey kunnen selecteren op basis van cohort/traject.

## Mapping naar profielen (later)
De radar-profielen (ontwikkel/vaardigheid) moeten uiteindelijk uit echte rubric scores komen.
In v1 is `computeProfiles()` nog dummy. In v2:
- definieer per rubric/theme/question → axis mapping
- compute per moment (M1/M2/M3/ALL)
