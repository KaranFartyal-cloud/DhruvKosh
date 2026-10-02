// Verify with NCPOR before publishing
import { stations } from './stations';

export const verifiedFacts = {
  antarcticExpeditions: {
    value: 45,
    label: "Antarctic Expeditions",
    shortLabel: "Expeditions",
    note: "Since 1981 (45th ISEA, 2025-26)",
    source: "NCPOR Public Record (45th ISEA, 2025-26)",
    sourceUrl: "https://ncpor.res.in/news/view/815"
  },
  activeStations: {
    get value() {
      // 3 permanent operational polar stations: Maitri & Bharati (Antarctica) and Himadri (Arctic)
      return stations.filter(s => s.status === 'active' && ['maitri', 'bharati', 'himadri'].includes(s.id)).length;
    },
    label: "Active Polar Stations",
    shortLabel: "Active Stations",
    note: "Maitri, Bharati (Antarctica) and Himadri (Arctic)",
    source: "NCPOR Operational Antarctic & Arctic Research Bases",
    sourceUrl: "https://ncpor.res.in"
  },
  programmeStart: {
    value: 1981,
    label: "Programme Inception",
    note: "Since 1981 (First Indian Antarctic Expedition)",
    source: "Ministry of Earth Sciences, Govt. of India"
  }
};

export default verifiedFacts;
