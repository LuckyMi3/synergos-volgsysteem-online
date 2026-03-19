// lib/rubrics/2vo.ts
// Bron: "Beoordelingsformulier Vakopleiding Haptonomie – Jaar 2 (2VO)" (2026)
// Let op: dit is een rubric-definitie; UI en invulsysteem blijven onaangetast.
// Scale 1–5 conform formulier.

export type RubricScale = {
  min: number;
  max: number;
  labels: string[]; // index 0..(max-min)
};

export type RubricQuestion = {
  id: string;
  text: string;
};

export type RubricTheme = {
  id: string;
  title: string;
  questions: RubricQuestion[];
};

export type RubricDefinition = {
  key: string;
  title: string;
  version: string;
  scale: RubricScale;
  themes: RubricTheme[];
};

export const rubric2VO: RubricDefinition = {
  key: "2vo",
  title: "Vakopleiding Haptonomie – Jaar 2 (2VO)",
  version: "2026-02-25",
  scale: {
    min: 1,
    max: 5,
    labels: [
      "Onvoldoende / niet zichtbaar",
      "In ontwikkeling",
      "Voldoende (niveau jaar 2)",
      "Goed",
      "Zeer goed / geïntegreerd en bewust ingezet",
    ],
  },
  themes: [
    {
      id: "c1",
      title: "1. Waarnemings- en ervaringscompetentie",
      questions: [
        { id: "c1_q1", text: "Neemt waar bij zichzelf" },
        { id: "c1_q2", text: "Neemt waar bij cliënt" },
        { id: "c1_q3", text: "Is aantoonbaar bewust van de interactiedynamiek" },
        { id: "c1_q4", text: "Onderscheidt waarneming, beleving en interpretatie" },
        { id: "c1_q5", text: "Verbindt waarnemingen uit gesprek, oefening en aanraking" },
        { id: "c1_q6", text: "Formuleert voorlopige conclusies open en toetsbaar" },
      ],
    },
    {
      id: "c2",
      title: "2. Haptonomisch vakmanschap",
      questions: [
        { id: "c2_q1", text: "Voert intake gestructureerd en afgestemd uit" },
        { id: "c2_q2", text: "Presenteert haptonomische werkwijze helder" },
        { id: "c2_q3", text: "Zet aanraking afgestemd in" },
        { id: "c2_q4", text: "Zet aanraking doelgericht in" },
        { id: "c2_q5", text: "Wisselt bewust tussen interactieposities" },
        { id: "c2_q6", text: "Biedt passende ervaringsmogelijkheden aan in gesprek en oefening" },
      ],
    },
    {
      id: "c3",
      title: "3. Begeleidingscompetentie",
      questions: [
        { id: "c3_q1", text: "Bouwt veiligheid en vertrouwen op" },
        { id: "c3_q2", text: "Kan actuele gevoelens op maat naar voren brengen" },
        { id: "c3_q3", text: "Kan stimuleren in onderzoeken van de beleving van de cliënt" },
        { id: "c3_q4", text: "Verheldert en verdiept de hulpvraag" },
        { id: "c3_q5", text: "Kan abstraheren en duiden naar andere situaties" },
        { id: "c3_q6", text: "Kan actuele ervaringen in aanraken relateren aan doelstellingen" },
        { id: "c3_q7", text: "Kan actuele ervaringen in gesprek relateren aan doelstellingen" },
        { id: "c3_q8", text: "Kan actuele ervaringen in oefenvormen relateren aan doelstellingen" },
        { id: "c3_q9", text: "Komt tot gezamenlijke doelstelling" },
        { id: "c3_q10", text: "Blijft aanwezig bij emotionele processen" },
        { id: "c3_q11", text: "Begeleidt veranderingsprocessen afgestemd" },
      ],
    },
    {
      id: "c4",
      title: "4. Diagnostische competentie",
      questions: [
        { id: "c4_q1", text: "Verzamelt relevante informatie in eerste ontmoeting" },
        { id: "c4_q2", text: "Herkent patronen bij cliënt" },
        { id: "c4_q3", text: "Herkent eigen reacties en posities" },
        { id: "c4_q4", text: "Formuleert voorlopige haptonomische diagnose" },
        { id: "c4_q5", text: "Verbindt geschiedenis met hier-en-nu" },
      ],
    },
    {
      id: "c5",
      title: "5. Interventie- en handelingscompetentie",
      questions: [
        { id: "c5_q1", text: "Legt de nadruk op mogelijkheden en moeilijkheden in het hier en nu" },
        { id: "c5_q2", text: "Kan luisteren en samenvatten" },
        { id: "c5_q3", text: "Kan verdiepen en ordenen" },
        { id: "c5_q4", text: "Kan confronteren en concretiseren" },
        { id: "c5_q5", text: "Maakt bewuste interventiekeuzes" },
        { id: "c5_q6", text: "Kan op passende wijze feedback geven aan cliënt" },
        { id: "c5_q7", text: "Gaat zorgvuldig om met ruimte en grenzen" },
        { id: "c5_q8", text: "Zoekt de grenzen van de mogelijkheden op" },
        { id: "c5_q9", text: "Kan omgaan met emotie angst – vluchten" },
        { id: "c5_q10", text: "Kan omgaan met emotie angst – bevriezen" },
        { id: "c5_q11", text: "Kan omgaan met emotie angst – vechten" },
        { id: "c5_q12", text: "Kan omgaan met boosheid" },
        { id: "c5_q13", text: "Kan omgaan met de emotie verdriet" },
        { id: "c5_q14", text: "Kan omgaan met de emotie blij" },
        {
          id: "c5_q15",
          text: "Kan eigen interactiepositie variëren ten dienste van de ontwikkeling van cliënt",
        },
        { id: "c5_q16", text: "Voorkomt herhaling zonder ontwikkeling" },
        { id: "c5_q17", text: "Is zich bewust van de rode draad in de begeleiding" },
        { id: "c5_q18", text: "Kan procesmatig en systematisch werken" },
        { id: "c5_q19", text: "Kan interventieschema hanteren ter evaluatie" },
      ],
    },
    {
      id: "c6",
      title: "6. Professionele attitude en ethisch handelen",
      questions: [
        { id: "c6_q1", text: "Handelt ten dienste van de cliënt" },
        {
          id: "c6_q2",
          text: "Doet appel op eigen verantwoordelijkheid, vermogen en inzicht van de cliënt",
        },
        {
          id: "c6_q3",
          text: "Aanvaardt cliënt zoals deze is; kan gedrag afwijzen maar niet de persoon",
        },
        { id: "c6_q4", text: "Is zich bewust van eigen normen en wereldbeeld" },
        { id: "c6_q5", text: "Is zich bewust van eigen inkleuring/betekenisverlening" },
        { id: "c6_q6", text: "Herkent (in)congruentie in eigen handelen" },
        { id: "c6_q7", text: "Neemt verantwoordelijkheid voor grenzen" },
        { id: "c6_q8", text: "Reflecteert ethisch kritisch op eigen handelen" },
      ],
    },
    {
      id: "c7",
      title: "7. Creativiteit en exploratievermogen",
      questions: [
        { id: "c7_q1", text: "Onderzoekt vanuit meerdere perspectieven" },
        { id: "c7_q2", text: "Toont flexibiliteit in aanpak" },
        { id: "c7_q3", text: "Kan doorpakken op onderwerpen" },
        { id: "c7_q4", text: "Benut vrijheid binnen professionele kaders" },
        { id: "c7_q5", text: "Stimuleert cliënten tot nieuwe ervaringen" },
        { id: "c7_q6", text: "Blijft fris en onderzoekend" },
      ],
    },
    {
      id: "c8",
      title: "8. Theoretische integratiecompetentie",
      questions: [
        { id: "c8_q1", text: "Past theorie toe in praktijk" },
        { id: "c8_q2", text: "Benoemt relevante theorieën bij casus" },
        { id: "c8_q3", text: "Onderscheidt haptonomische en andere benaderingen" },
        { id: "c8_q4", text: "Onderbouwt keuzes theoretisch" },
        { id: "c8_q5", text: "Integreert theorie en ervaring" },
      ],
    },
    {
      id: "c9",
      title: "9. Reflectie- en evaluatiecompetentie",
      questions: [
        { id: "c9_q1", text: "Reflecteert systematisch op eigen handelen" },
        { id: "c9_q2", text: "Benoemt sterke kanten en ontwikkelpunten" },
        { id: "c9_q3", text: "Ontvangt feedback open en onderzoekend" },
        { id: "c9_q4", text: "Past feedback toe in handelen" },
        { id: "c9_q5", text: "Draagt bij aan groepsreflectie" },
      ],
    },
  ],
};

export default rubric2VO;