// lib/rubrics/basisjaar.ts
// Placeholder – basisjaar heeft mogelijk andere logica, maar we houden dezelfde shape.

import type { RubricDefinition } from "./2vo";

export const rubricBasisjaar: RubricDefinition = {
  key: "basisjaar",
  title: "Basisjaar Vakopleiding Haptonomie",
  version: "placeholder",
  scale: {
    // TODO: schaal kan afwijken (bijv. 0–10 of 1–5). Voor nu 1–5 consistent.
    min: 1,
    max: 5,
    labels: [
      "Onvoldoende / niet zichtbaar",
      "In ontwikkeling",
      "Voldoende (basisjaar)",
      "Goed",
      "Zeer goed / geïntegreerd en bewust ingezet",
    ],
  },
  themes: [
    // TODO: basisjaar-thema's en vragen toevoegen zodra aangeleverd
  ],
};

export default rubricBasisjaar;