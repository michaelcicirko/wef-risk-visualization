// World Economic Forum Global Risks Data
// Three time states with consistent IDs for object constancy in D3

export const riskData = {
  2026: [
    { id: "geo-confrontation", title: "Geoeconomic confrontation", rank: 1, value: 10, category: "geopolitical" },
    { id: "state-conflict", title: "State-based armed conflict", rank: 2, value: 9, category: "geopolitical" },
    { id: "extreme-weather", title: "Extreme weather events", rank: 3, value: 8, category: "environmental" },
    { id: "societal-polarization", title: "Societal polarization", rank: 4, value: 7, category: "societal" },
    { id: "misinformation", title: "Misinformation and disinformation", rank: 5, value: 6, category: "technological" },
    { id: "economic-downturn", title: "Economic downturn", rank: 6, value: 5, category: "economic" },
    { id: "human-rights", title: "Erosion of human rights and/or of civic freedoms", rank: 7, value: 4, category: "societal" },
    { id: "ai-outcomes", title: "Adverse outcomes of AI technologies", rank: 8, value: 3, category: "technological" },
    { id: "cyber-insecurity", title: "Cyber insecurity", rank: 9, value: 2, category: "technological" },
    { id: "inequality", title: "Inequality", rank: 10, value: 1, category: "societal" }
  ],
  2028: [
    { id: "geo-confrontation", title: "Geoeconomic confrontation", rank: 1, value: 10, category: "geopolitical" },
    { id: "misinformation", title: "Misinformation and disinformation", rank: 2, value: 9, category: "technological" },
    { id: "societal-polarization", title: "Societal polarization", rank: 3, value: 8, category: "societal" },
    { id: "extreme-weather", title: "Extreme weather events", rank: 4, value: 7, category: "environmental" },
    { id: "state-conflict", title: "State-based armed conflict", rank: 5, value: 6, category: "geopolitical" },
    { id: "cyber-insecurity", title: "Cyber insecurity", rank: 6, value: 5, category: "technological" },
    { id: "inequality", title: "Inequality", rank: 7, value: 4, category: "societal" },
    { id: "human-rights", title: "Erosion of human rights and/or of civic freedoms", rank: 8, value: 3, category: "societal" },
    { id: "pollution", title: "Pollution", rank: 9, value: 2, category: "environmental" },
    { id: "migration", title: "Involuntary migration or displacement", rank: 10, value: 1, category: "societal" }
  ],
  2036: [
    { id: "extreme-weather", title: "Extreme weather events", rank: 1, value: 10, category: "environmental" },
    { id: "biodiversity", title: "Biodiversity loss and ecosystem collapse", rank: 2, value: 9, category: "environmental" },
    { id: "earth-systems", title: "Critical change to Earth systems", rank: 3, value: 8, category: "environmental" },
    { id: "misinformation", title: "Misinformation and disinformation", rank: 4, value: 7, category: "technological" },
    { id: "ai-outcomes", title: "Adverse outcomes of AI technologies", rank: 5, value: 6, category: "technological" },
    { id: "resource-shortages", title: "Natural resource shortages", rank: 6, value: 5, category: "environmental" },
    { id: "inequality", title: "Inequality", rank: 7, value: 4, category: "societal" },
    { id: "cyber-insecurity", title: "Cyber insecurity", rank: 8, value: 3, category: "technological" },
    { id: "societal-polarization", title: "Societal polarization", rank: 9, value: 2, category: "societal" },
    { id: "pollution", title: "Pollution", rank: 10, value: 1, category: "environmental" }
  ]
};

// Category to color mapping
export const categoryColors = {
  geopolitical: "#e67e22",
  societal: "#e74c3c",
  environmental: "#27ae60",
  technological: "#8e44ad",
  economic: "#3498db"
};

// Year range
export const YEAR_MIN = 2026;
export const YEAR_MAX = 2036;
export const YEAR_MID = 2028;
