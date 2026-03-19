// lib/profiles/axes.ts

export type RadarAxis = { key: string; label: string };

/**
 * Ontwikkelprofiel (6 assen) — werkbenamingen
 * Later met kwaliteitscommissie definitief maken.
 */
export const ontwikkelAxes: RadarAxis[] = [
  { key: "zelfinzicht", label: "Zelfinzicht" },
  { key: "lichaamsbewustzijn", label: "Lichaamsbewustzijn" },
  { key: "relationeel", label: "Relationele afstemming" },
  { key: "draagkracht", label: "Draagkracht" },
  { key: "creativiteit", label: "Creativiteit" },
  { key: "integratie", label: "Reflectie & integratie" },
];

/**
 * Vaardigheidsprofiel (6 assen) — werkbenamingen
 */
export const vaardigheidAxes: RadarAxis[] = [
  { key: "lichamelijkheid", label: "Lichamelijkheid" },
  { key: "betekenis", label: "Betekenis hier" },
  { key: "relatie", label: "Therapeutische relatie" },
  { key: "methodisch", label: "Methodisch werken" },
  { key: "professioneel", label: "Prof. ontwikkeling" },
  { key: "positionering", label: "Positionering" },
];

export type OntwikkelKey = (typeof ontwikkelAxes)[number]["key"];
export type VaardigheidKey = (typeof vaardigheidAxes)[number]["key"];