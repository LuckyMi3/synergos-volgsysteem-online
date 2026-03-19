export const rubric1VO = {
  id: "1vo",
  title: "1VO – Vakopleiding Haptonomie",

  scale: {
    min: 0,
    max: 10,
    labels: {
      0: "onbekwaam / niet eigen",
      5: "in ontwikkeling",
      10: "bekwaam / eigen",
    },
  },

  themes: [
    {
      id: "lichaamsbewustzijn",
      title: "Lichaamsbewustzijn",
      questions: [
        {
          id: "lichaam_signaleren",
          text: "Ik kan lichamelijke signalen bij mezelf opmerken.",
        },
        {
          id: "spanning_ontspanning",
          text: "Ik herken spanning en ontspanning in mijn lichaam.",
        },
        {
          id: "ademhaling_waarnemen",
          text: "Ik kan mijn ademhaling waarnemen zonder deze te sturen.",
        },
      ],
    },

    {
      id: "aanraking",
      title: "Aanraking",
      questions: [
        {
          id: "aanwezig_bij_aanraking",
          text: "Ik kan aanwezig blijven bij aanraking.",
        },
        {
          id: "grenzen_in_aanraking",
          text: "Ik ben me bewust van mijn eigen grenzen in aanraking.",
        },
        {
          id: "functioneel_affectief_onderscheid",
          text:
            "Ik kan verschil voelen tussen functioneel en affectief contact.",
        },
      ],
    },

    {
      id: "afstemming",
      title: "Afstemming",
      questions: [
        {
          id: "afstemmen_op_ander",
          text:
            "Ik kan afstemmen op de ander zonder mezelf daarbij te verliezen.",
        },
        {
          id: "verstoring_afstemming",
          text: "Ik merk wanneer de afstemming verstoord raakt.",
        },
      ],
    },

    {
      id: "grenzen",
      title: "Grenzen",
      questions: [
        {
          id: "eigen_grenzen_herkennen",
          text: "Ik herken mijn eigen grenzen.",
        },
        {
          id: "grenzen_voelbaar_maken",
          text: "Ik kan mijn grenzen voelbaar maken.",
        },
      ],
    },

    {
      id: "aanwezigheid",
      title: "Aanwezigheid",
      questions: [
        {
          id: "met_aandacht_aanwezig",
          text: "Ik kan met aandacht aanwezig blijven.",
        },
        {
          id: "vertragen",
          text: "Ik kan vertragen wanneer dat nodig is.",
        },
      ],
    },

    {
      id: "zelfreflectie",
      title: "Zelfreflectie",
      questions: [
        {
          id: "reflectie_op_handelen",
          text: "Ik kan reflecteren op mijn eigen handelen.",
        },
        {
          id: "open_voor_feedback",
          text: "Ik sta open voor feedback.",
        },
      ],
    },

    {
      id: "professionele_houding",
      title: "Professionele houding",
      questions: [
        {
          id: "verantwoordelijkheid_leerproces",
          text:
            "Ik neem verantwoordelijkheid voor mijn eigen leerproces.",
        },
        {
          id: "leerpunten_benoemen",
          text: "Ik kan mijn eigen leerpunten benoemen.",
        },
      ],
    },
  ],
};
