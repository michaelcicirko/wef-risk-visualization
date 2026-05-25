// WEF Risk Flow — Sankey dataset
// Flow: Source Category → Risk → Impact Domain
// Values represent relative severity contribution (from WEF risk scores)
// Three layers: Source (risk category) → Risk → Impact

export const sankeyNodes = [
  // Layer 0 — Source categories
  { id: 'cat-geo',  label: 'Geopolitical',  layer: 0, category: 'geopolitical' },
  { id: 'cat-env',  label: 'Environmental', layer: 0, category: 'environmental' },
  { id: 'cat-tech', label: 'Technological', layer: 0, category: 'technological' },
  { id: 'cat-soc',  label: 'Societal',      layer: 0, category: 'societal' },
  { id: 'cat-eco',  label: 'Economic',      layer: 0, category: 'economic' },

  // Layer 1 — Top risks (2026 ranking)
  { id: 'r-geocon',   label: 'Geoeconomic\nConfrontation', layer: 1, category: 'geopolitical' },
  { id: 'r-conflict', label: 'Armed\nConflict',             layer: 1, category: 'geopolitical' },
  { id: 'r-weather',  label: 'Extreme\nWeather',            layer: 1, category: 'environmental' },
  { id: 'r-polar',    label: 'Societal\nPolarization',      layer: 1, category: 'societal' },
  { id: 'r-misinfo',  label: 'Misinformation\n& Disinfo',   layer: 1, category: 'technological' },
  { id: 'r-ecodown',  label: 'Economic\nDownturn',          layer: 1, category: 'economic' },
  { id: 'r-cyber',    label: 'Cyber\nInsecurity',           layer: 1, category: 'technological' },
  { id: 'r-ai',       label: 'AI Adverse\nOutcomes',        layer: 1, category: 'technological' },

  // Layer 2 — Impact domains
  { id: 'imp-security',  label: 'Security\nInstability',    layer: 2, category: 'impact' },
  { id: 'imp-economic',  label: 'Economic\nShock',          layer: 2, category: 'impact' },
  { id: 'imp-social',    label: 'Social\nCohesion',         layer: 2, category: 'impact' },
  { id: 'imp-climate',   label: 'Climate\nDegradation',     layer: 2, category: 'impact' },
  { id: 'imp-digital',   label: 'Digital\nVulnerability',   layer: 2, category: 'impact' },
];

export const sankeyLinks = [
  // Geopolitical → Risks
  { source: 'cat-geo',  target: 'r-geocon',   value: 10 },
  { source: 'cat-geo',  target: 'r-conflict', value: 9 },

  // Environmental → Risks
  { source: 'cat-env',  target: 'r-weather',  value: 8 },

  // Societal → Risks
  { source: 'cat-soc',  target: 'r-polar',    value: 7 },

  // Technological → Risks
  { source: 'cat-tech', target: 'r-misinfo',  value: 6 },
  { source: 'cat-tech', target: 'r-cyber',    value: 2 },
  { source: 'cat-tech', target: 'r-ai',       value: 3 },

  // Economic → Risks
  { source: 'cat-eco',  target: 'r-ecodown',  value: 5 },

  // Risks → Impacts
  { source: 'r-geocon',   target: 'imp-security',  value: 6 },
  { source: 'r-geocon',   target: 'imp-economic',  value: 4 },
  { source: 'r-conflict', target: 'imp-security',  value: 7 },
  { source: 'r-conflict', target: 'imp-social',    value: 2 },
  { source: 'r-weather',  target: 'imp-climate',   value: 5 },
  { source: 'r-weather',  target: 'imp-economic',  value: 3 },
  { source: 'r-polar',    target: 'imp-social',    value: 5 },
  { source: 'r-polar',    target: 'imp-security',  value: 2 },
  { source: 'r-misinfo',  target: 'imp-social',    value: 4 },
  { source: 'r-misinfo',  target: 'imp-digital',   value: 2 },
  { source: 'r-ecodown',  target: 'imp-economic',  value: 5 },
  { source: 'r-cyber',    target: 'imp-digital',   value: 3 },
  { source: 'r-cyber',    target: 'imp-economic',  value: 1 },
  { source: 'r-ai',       target: 'imp-digital',   value: 2 },
  { source: 'r-ai',       target: 'imp-social',    value: 1 },
];

export const nodeColors = {
  geopolitical:  '#e67e22',
  environmental: '#27ae60',
  technological: '#8e44ad',
  societal:      '#e74c3c',
  economic:      '#3498db',
  impact:        '#5a5a8a',
};

// Reveal order: link indices to animate in sequence
export const LINK_REVEAL_ORDER = [
  // Source→Risk links first
  'cat-geo→r-geocon', 'cat-geo→r-conflict',
  'cat-env→r-weather',
  'cat-soc→r-polar',
  'cat-tech→r-misinfo', 'cat-tech→r-cyber', 'cat-tech→r-ai',
  'cat-eco→r-ecodown',
  // Then Risk→Impact links
  'r-geocon→imp-security', 'r-geocon→imp-economic',
  'r-conflict→imp-security', 'r-conflict→imp-social',
  'r-weather→imp-climate', 'r-weather→imp-economic',
  'r-polar→imp-social', 'r-polar→imp-security',
  'r-misinfo→imp-social', 'r-misinfo→imp-digital',
  'r-ecodown→imp-economic',
  'r-cyber→imp-digital', 'r-cyber→imp-economic',
  'r-ai→imp-digital', 'r-ai→imp-social',
];
