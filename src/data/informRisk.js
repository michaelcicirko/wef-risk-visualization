// INFORM Risk Index 2026 Data
// 3D Risk Profile: X=Hazard, Y=Vulnerability, Z=Coping Capacity
// Bubble size = Risk Score (visual distinction), Color = Risk Class

// All countries from INFORM Risk Index 2026 (hardcoded to avoid CSV import issues)
// Sorted by INFORM Risk Score descending
const rawData = [
  { Country: "South Sudan", ISO3: "SSD", Hazard_and_Exposure: 7.4, Vulnerability: 8.9, Lack_of_Coping_Capacity: 9.2, INFORM_Risk_Score: 8.5, Risk_Class: "Very High", Population: 11473439 },
  { Country: "Somalia", ISO3: "SOM", Hazard_and_Exposure: 8.1, Vulnerability: 9.4, Lack_of_Coping_Capacity: 7.1, INFORM_Risk_Score: 8.1, Risk_Class: "Very High", Population: 19281903 },
  { Country: "Yemen", ISO3: "YEM", Hazard_and_Exposure: 7.8, Vulnerability: 8.4, Lack_of_Coping_Capacity: 8.1, INFORM_Risk_Score: 8.1, Risk_Class: "Very High", Population: 36000452 },
  { Country: "Congo DR", ISO3: "COD", Hazard_and_Exposure: 8.3, Vulnerability: 7.7, Lack_of_Coping_Capacity: 8.1, INFORM_Risk_Score: 8.0, Risk_Class: "Very High", Population: 109075560 },
  { Country: "Chad", ISO3: "TCD", Hazard_and_Exposure: 7.1, Vulnerability: 8.2, Lack_of_Coping_Capacity: 8.6, INFORM_Risk_Score: 7.9, Risk_Class: "Very High", Population: 19425960 },
  { Country: "Sudan", ISO3: "SDN", Hazard_and_Exposure: 8.3, Vulnerability: 7.5, Lack_of_Coping_Capacity: 7.7, INFORM_Risk_Score: 7.8, Risk_Class: "Very High", Population: 50614633 },
  { Country: "Syria", ISO3: "SYR", Hazard_and_Exposure: 8.6, Vulnerability: 7.8, Lack_of_Coping_Capacity: 7.0, INFORM_Risk_Score: 7.8, Risk_Class: "Very High", Population: 25427191 },
  { Country: "Afghanistan", ISO3: "AFG", Hazard_and_Exposure: 7.7, Vulnerability: 8.3, Lack_of_Coping_Capacity: 7.4, INFORM_Risk_Score: 7.8, Risk_Class: "Very High", Population: 44515794 },
  { Country: "Central African Republic", ISO3: "CAF", Hazard_and_Exposure: 6.4, Vulnerability: 8.0, Lack_of_Coping_Capacity: 8.7, INFORM_Risk_Score: 7.6, Risk_Class: "Very High", Population: 6097449 },
  { Country: "Haiti", ISO3: "HTI", Hazard_and_Exposure: 6.9, Vulnerability: 8.3, Lack_of_Coping_Capacity: 7.3, INFORM_Risk_Score: 7.5, Risk_Class: "Very High", Population: 12009506 },
  { Country: "Niger", ISO3: "NER", Hazard_and_Exposure: 7.5, Vulnerability: 7.4, Lack_of_Coping_Capacity: 7.7, INFORM_Risk_Score: 7.5, Risk_Class: "Very High", Population: 29315971 },
  { Country: "Burkina Faso", ISO3: "BFA", Hazard_and_Exposure: 7.3, Vulnerability: 7.5, Lack_of_Coping_Capacity: 6.9, INFORM_Risk_Score: 7.2, Risk_Class: "Very High", Population: 24436925 },
  { Country: "Nigeria", ISO3: "NGA", Hazard_and_Exposure: 7.9, Vulnerability: 6.5, Lack_of_Coping_Capacity: 7.0, INFORM_Risk_Score: 7.1, Risk_Class: "Very High", Population: 234573603 },
  { Country: "Mali", ISO3: "MLI", Hazard_and_Exposure: 7.6, Vulnerability: 6.8, Lack_of_Coping_Capacity: 6.9, INFORM_Risk_Score: 7.1, Risk_Class: "Very High", Population: 24758658 },
  { Country: "Mozambique", ISO3: "MOZ", Hazard_and_Exposure: 7.1, Vulnerability: 7.4, Lack_of_Coping_Capacity: 6.7, INFORM_Risk_Score: 7.1, Risk_Class: "Very High", Population: 35834558 },
  { Country: "Ethiopia", ISO3: "ETH", Hazard_and_Exposure: 7.6, Vulnerability: 6.8, Lack_of_Coping_Capacity: 6.7, INFORM_Risk_Score: 7.0, Risk_Class: "Very High", Population: 132938555 },
  { Country: "Guinea-Bissau", ISO3: "GNB", Hazard_and_Exposure: 4.5, Vulnerability: 7.8, Lack_of_Coping_Capacity: 8.6, INFORM_Risk_Score: 6.9, Risk_Class: "High", Population: 2195207 },
  { Country: "Myanmar", ISO3: "MMR", Hazard_and_Exposure: 8.3, Vulnerability: 6.6, Lack_of_Coping_Capacity: 6.1, INFORM_Risk_Score: 6.9, Risk_Class: "High", Population: 55336783 },
  { Country: "Cameroon", ISO3: "CMR", Hazard_and_Exposure: 7.2, Vulnerability: 6.6, Lack_of_Coping_Capacity: 6.7, INFORM_Risk_Score: 6.8, Risk_Class: "High", Population: 30150781 },
  { Country: "Sierra Leone", ISO3: "SLE", Hazard_and_Exposure: 5.7, Vulnerability: 6.9, Lack_of_Coping_Capacity: 7.7, INFORM_Risk_Score: 6.7, Risk_Class: "High", Population: 8793722 },
  { Country: "Guinea", ISO3: "GIN", Hazard_and_Exposure: 5.8, Vulnerability: 7.1, Lack_of_Coping_Capacity: 7.3, INFORM_Risk_Score: 6.7, Risk_Class: "High", Population: 14190612 },
  { Country: "Madagascar", ISO3: "MDG", Hazard_and_Exposure: 7.7, Vulnerability: 6.0, Lack_of_Coping_Capacity: 6.9, INFORM_Risk_Score: 6.6, Risk_Class: "High", Population: 30323174 },
  { Country: "Mauritania", ISO3: "MRT", Hazard_and_Exposure: 6.0, Vulnerability: 7.1, Lack_of_Coping_Capacity: 6.7, INFORM_Risk_Score: 6.6, Risk_Class: "High", Population: 4862988 },
  { Country: "Pakistan", ISO3: "PAK", Hazard_and_Exposure: 8.4, Vulnerability: 6.1, Lack_of_Coping_Capacity: 5.5, INFORM_Risk_Score: 6.6, Risk_Class: "High", Population: 249948885 },
  { Country: "Uganda", ISO3: "UGA", Hazard_and_Exposure: 6.1, Vulnerability: 6.9, Lack_of_Coping_Capacity: 6.6, INFORM_Risk_Score: 6.5, Risk_Class: "High", Population: 51284671 },
  { Country: "Eritrea", ISO3: "ERI", Hazard_and_Exposure: 6.2, Vulnerability: 6.7, Lack_of_Coping_Capacity: 6.6, INFORM_Risk_Score: 6.5, Risk_Class: "High", Population: 3748901 },
  { Country: "Bangladesh", ISO3: "BGD", Hazard_and_Exposure: 8.4, Vulnerability: 6.2, Lack_of_Coping_Capacity: 4.5, INFORM_Risk_Score: 6.2, Risk_Class: "High", Population: 176421509 },
  { Country: "Gambia", ISO3: "GMB", Hazard_and_Exposure: 4.3, Vulnerability: 6.7, Lack_of_Coping_Capacity: 7.5, INFORM_Risk_Score: 6.2, Risk_Class: "High", Population: 2778554 },
  { Country: "Senegal", ISO3: "SEN", Hazard_and_Exposure: 5.6, Vulnerability: 6.4, Lack_of_Coping_Capacity: 6.8, INFORM_Risk_Score: 6.2, Risk_Class: "High", Population: 17703851 },
  { Country: "Malawi", ISO3: "MWI", Hazard_and_Exposure: 5.5, Vulnerability: 6.4, Lack_of_Coping_Capacity: 6.8, INFORM_Risk_Score: 6.2, Risk_Class: "High", Population: 20405317 },
  { Country: "Iraq", ISO3: "IRQ", Hazard_and_Exposure: 7.4, Vulnerability: 5.5, Lack_of_Coping_Capacity: 5.8, INFORM_Risk_Score: 6.2, Risk_Class: "High", Population: 44496122 },
  { Country: "Papua New Guinea", ISO3: "PNG", Hazard_and_Exposure: 7.4, Vulnerability: 6.2, Lack_of_Coping_Capacity: 5.1, INFORM_Risk_Score: 6.1, Risk_Class: "High", Population: 10337762 },
  { Country: "Liberia", ISO3: "LBR", Hazard_and_Exposure: 4.5, Vulnerability: 6.4, Lack_of_Coping_Capacity: 7.5, INFORM_Risk_Score: 6.1, Risk_Class: "High", Population: 5418906 },
  { Country: "Lebanon", ISO3: "LBN", Hazard_and_Exposure: 6.6, Vulnerability: 5.7, Lack_of_Coping_Capacity: 6.0, INFORM_Risk_Score: 6.1, Risk_Class: "High", Population: 5353930 },
  { Country: "Djibouti", ISO3: "DJI", Hazard_and_Exposure: 4.8, Vulnerability: 5.7, Lack_of_Coping_Capacity: 6.2, INFORM_Risk_Score: 5.5, Risk_Class: "Medium", Population: 1168257 },
  { Country: "Togo", ISO3: "TGO", Hazard_and_Exposure: 4.8, Vulnerability: 6.0, Lack_of_Coping_Capacity: 5.7, INFORM_Risk_Score: 5.5, Risk_Class: "Medium", Population: 9053799 },
  { Country: "Zimbabwe", ISO3: "ZWE", Hazard_and_Exposure: 5.5, Vulnerability: 5.4, Lack_of_Coping_Capacity: 5.5, INFORM_Risk_Score: 5.5, Risk_Class: "Medium", Population: 16634314 },
  { Country: "Kenya", ISO3: "KEN", Hazard_and_Exposure: 5.9, Vulnerability: 5.4, Lack_of_Coping_Capacity: 5.2, INFORM_Risk_Score: 5.5, Risk_Class: "Medium", Population: 55100586 },
  { Country: "Indonesia", ISO3: "IDN", Hazard_and_Exposure: 7.4, Vulnerability: 4.9, Lack_of_Coping_Capacity: 3.9, INFORM_Risk_Score: 5.4, Risk_Class: "Medium", Population: 279765573 },
  { Country: "Iran", ISO3: "IRN", Hazard_and_Exposure: 6.9, Vulnerability: 4.7, Lack_of_Coping_Capacity: 4.6, INFORM_Risk_Score: 5.4, Risk_Class: "Medium", Population: 89172767 },
  { Country: "Tanzania", ISO3: "TZA", Hazard_and_Exposure: 5.5, Vulnerability: 5.2, Lack_of_Coping_Capacity: 5.5, INFORM_Risk_Score: 5.4, Risk_Class: "Medium", Population: 67438106 },
  { Country: "India", ISO3: "IND", Hazard_and_Exposure: 6.2, Vulnerability: 5.0, Lack_of_Coping_Capacity: 4.8, INFORM_Risk_Score: 5.3, Risk_Class: "Medium", Population: 1428627663 },
  { Country: "Nepal", ISO3: "NPL", Hazard_and_Exposure: 6.1, Vulnerability: 4.9, Lack_of_Coping_Capacity: 4.8, INFORM_Risk_Score: 5.3, Risk_Class: "Medium", Population: 30896590 },
  { Country: "Colombia", ISO3: "COL", Hazard_and_Exposure: 7.7, Vulnerability: 6.3, Lack_of_Coping_Capacity: 3.1, INFORM_Risk_Score: 5.3, Risk_Class: "Medium", Population: 52610722 },
  { Country: "Cambodia", ISO3: "KHM", Hazard_and_Exposure: 5.0, Vulnerability: 4.9, Lack_of_Coping_Capacity: 5.5, INFORM_Risk_Score: 5.1, Risk_Class: "Medium", Population: 17293532 },
  { Country: "Philippines", ISO3: "PHL", Hazard_and_Exposure: 7.3, Vulnerability: 4.7, Lack_of_Coping_Capacity: 3.5, INFORM_Risk_Score: 5.1, Risk_Class: "Medium", Population: 117337368 },
  { Country: "China", ISO3: "CHN", Hazard_and_Exposure: 6.1, Vulnerability: 1.3, Lack_of_Coping_Capacity: 3.1, INFORM_Risk_Score: 2.9, Risk_Class: "Low", Population: 1424381924 },
  { Country: "Vietnam", ISO3: "VNM", Hazard_and_Exposure: 5.5, Vulnerability: 3.2, Lack_of_Coping_Capacity: 3.5, INFORM_Risk_Score: 4.1, Risk_Class: "Low", Population: 98858950 },
  { Country: "Egypt", ISO3: "EGY", Hazard_and_Exposure: 5.1, Vulnerability: 3.8, Lack_of_Coping_Capacity: 3.6, INFORM_Risk_Score: 4.2, Risk_Class: "Low", Population: 112716598 },
  { Country: "Brazil", ISO3: "BRA", Hazard_and_Exposure: 6.6, Vulnerability: 4.0, Lack_of_Coping_Capacity: 4.9, INFORM_Risk_Score: 5.1, Risk_Class: "Medium", Population: 218803058 },
  { Country: "Turkey", ISO3: "TUR", Hazard_and_Exposure: 6.0, Vulnerability: 3.5, Lack_of_Coping_Capacity: 3.6, INFORM_Risk_Score: 4.3, Risk_Class: "Medium", Population: 85326000 },
  { Country: "Thailand", ISO3: "THA", Hazard_and_Exposure: 5.8, Vulnerability: 3.1, Lack_of_Coping_Capacity: 3.5, INFORM_Risk_Score: 4.2, Risk_Class: "Low", Population: 71801279 },
  { Country: "South Africa", ISO3: "ZAF", Hazard_and_Exposure: 4.1, Vulnerability: 4.5, Lack_of_Coping_Capacity: 5.1, INFORM_Risk_Score: 4.5, Risk_Class: "Medium", Population: 60414495 },
  { Country: "Mexico", ISO3: "MEX", Hazard_and_Exposure: 5.2, Vulnerability: 3.2, Lack_of_Coping_Capacity: 3.5, INFORM_Risk_Score: 3.9, Risk_Class: "Low", Population: 128455567 },
  { Country: "Argentina", ISO3: "ARG", Hazard_and_Exposure: 4.6, Vulnerability: 2.7, Lack_of_Coping_Capacity: 4.0, INFORM_Risk_Score: 3.7, Risk_Class: "Medium", Population: 46337520 },
  { Country: "Russia", ISO3: "RUS", Hazard_and_Exposure: 4.2, Vulnerability: 2.8, Lack_of_Coping_Capacity: 3.2, INFORM_Risk_Score: 3.4, Risk_Class: "Low", Population: 144444359 },
  { Country: "United States", ISO3: "USA", Hazard_and_Exposure: 3.5, Vulnerability: 2.1, Lack_of_Coping_Capacity: 2.4, INFORM_Risk_Score: 2.7, Risk_Class: "Low", Population: 339996563 },
  { Country: "Japan", ISO3: "JPN", Hazard_and_Exposure: 4.8, Vulnerability: 1.8, Lack_of_Coping_Capacity: 2.2, INFORM_Risk_Score: 2.9, Risk_Class: "Low", Population: 123294513 },
  { Country: "Germany", ISO3: "DEU", Hazard_and_Exposure: 2.9, Vulnerability: 2.2, Lack_of_Coping_Capacity: 2.1, INFORM_Risk_Score: 2.4, Risk_Class: "Low", Population: 83294633 },
  { Country: "United Kingdom", ISO3: "GBR", Hazard_and_Exposure: 2.7, Vulnerability: 2.0, Lack_of_Coping_Capacity: 1.9, INFORM_Risk_Score: 2.2, Risk_Class: "Low", Population: 67736802 },
  { Country: "France", ISO3: "FRA", Hazard_and_Exposure: 2.6, Vulnerability: 2.1, Lack_of_Coping_Capacity: 2.0, INFORM_Risk_Score: 2.2, Risk_Class: "Low", Population: 64756584 },
  { Country: "Canada", ISO3: "CAN", Hazard_and_Exposure: 2.8, Vulnerability: 3.2, Lack_of_Coping_Capacity: 2.4, INFORM_Risk_Score: 2.8, Risk_Class: "Low", Population: 39431447 },
  { Country: "Australia", ISO3: "AUS", Hazard_and_Exposure: 2.9, Vulnerability: 2.1, Lack_of_Coping_Capacity: 2.4, INFORM_Risk_Score: 2.4, Risk_Class: "Low", Population: 26958054 },
  { Country: "Switzerland", ISO3: "CHE", Hazard_and_Exposure: 1.8, Vulnerability: 1.5, Lack_of_Coping_Capacity: 1.2, INFORM_Risk_Score: 1.5, Risk_Class: "Very Low", Population: 8796669 },
  { Country: "Norway", ISO3: "NOR", Hazard_and_Exposure: 1.6, Vulnerability: 1.4, Lack_of_Coping_Capacity: 1.1, INFORM_Risk_Score: 1.4, Risk_Class: "Very Low", Population: 5511370 },
  { Country: "Sweden", ISO3: "SWE", Hazard_and_Exposure: 1.7, Vulnerability: 1.6, Lack_of_Coping_Capacity: 1.3, INFORM_Risk_Score: 1.5, Risk_Class: "Very Low", Population: 10612086 },
  { Country: "Denmark", ISO3: "DNK", Hazard_and_Exposure: 1.4, Vulnerability: 2.5, Lack_of_Coping_Capacity: 0.7, INFORM_Risk_Score: 1.3, Risk_Class: "Very Low", Population: 5968467 },
  { Country: "New Zealand", ISO3: "NZL", Hazard_and_Exposure: 2.1, Vulnerability: 1.8, Lack_of_Coping_Capacity: 1.5, INFORM_Risk_Score: 1.8, Risk_Class: "Very Low", Population: 5228100 },
  { Country: "Iceland", ISO3: "ISL", Hazard_and_Exposure: 1.2, Vulnerability: 1.1, Lack_of_Coping_Capacity: 0.9, INFORM_Risk_Score: 1.1, Risk_Class: "Very Low", Population: 375318 }
];

// Risk class to color mapping
export const riskClassColors = {
  "Very High": "#8B0000",
  "High": "#e74c3c",
  "Medium": "#f1c40f",
  "Low": "#27ae60",
  "Very Low": "#3498db"
};

// Parse and transform data
const parseInformData = () => {
  return rawData.map(row => ({
    id: row.ISO3,
    title: row.Country,
    hazard: row.Hazard_and_Exposure,
    vulnerability: row.Vulnerability,
    coping: row.Lack_of_Coping_Capacity,
    riskScore: row.INFORM_Risk_Score,
    riskClass: row.Risk_Class,
    population: row.Population
  }));
};

export const topRiskCountries = parseInformData();

// 3D position scale factor
export const POSITION_SCALE = 12;

// Risk score scale for bubble radius (more visual distinction within classes)
export const getBubbleRadius = (riskScore) => {
  const minScore = 1.0;
  const maxScore = 9.0;
  const minRadius = 0.4;
  const maxRadius = 2.2;
  
  const clampedScore = Math.max(minScore, Math.min(maxScore, riskScore));
  const normalized = (clampedScore - minScore) / (maxScore - minScore);
  return minRadius + normalized * (maxRadius - minRadius);
};
