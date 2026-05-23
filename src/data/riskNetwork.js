// WEF Global Risks Interconnections
// Edges represent direct causal or amplifying relationships between risks
// Based on the WEF Global Risks Report interconnections framework

export const riskNodes = [
  { id: 'geo-confrontation',    label: 'Geoeconomic\nConfrontation',  category: 'geopolitical' },
  { id: 'state-conflict',       label: 'State-based\nArmed Conflict', category: 'geopolitical' },
  { id: 'extreme-weather',      label: 'Extreme\nWeather',            category: 'environmental' },
  { id: 'societal-polarization',label: 'Societal\nPolarization',      category: 'societal' },
  { id: 'misinformation',       label: 'Misinformation &\nDisinfo',   category: 'technological' },
  { id: 'economic-downturn',    label: 'Economic\nDownturn',          category: 'economic' },
  { id: 'human-rights',         label: 'Human Rights\nErosion',       category: 'societal' },
  { id: 'ai-outcomes',          label: 'AI Adverse\nOutcomes',        category: 'technological' },
  { id: 'cyber-insecurity',     label: 'Cyber\nInsecurity',           category: 'technological' },
  { id: 'inequality',           label: 'Inequality',                  category: 'societal' },
  { id: 'biodiversity',         label: 'Biodiversity\nLoss',          category: 'environmental' },
  { id: 'pollution',            label: 'Pollution',                   category: 'environmental' },
  { id: 'migration',            label: 'Involuntary\nMigration',      category: 'societal' },
  { id: 'earth-systems',        label: 'Earth Systems\nChange',       category: 'environmental' },
  { id: 'resource-shortages',   label: 'Resource\nShortages',         category: 'environmental' },
];

// Directed edges: source amplifies / causes / worsens target
// strength: 1=weak, 2=moderate, 3=strong
export const riskEdges = [
  // Geopolitical cluster
  { source: 'geo-confrontation',    target: 'state-conflict',        strength: 3 },
  { source: 'geo-confrontation',    target: 'economic-downturn',     strength: 3 },
  { source: 'geo-confrontation',    target: 'cyber-insecurity',      strength: 2 },
  { source: 'state-conflict',       target: 'migration',             strength: 3 },
  { source: 'state-conflict',       target: 'human-rights',          strength: 3 },
  { source: 'state-conflict',       target: 'economic-downturn',     strength: 2 },

  // Information & technology cluster
  { source: 'misinformation',       target: 'societal-polarization', strength: 3 },
  { source: 'misinformation',       target: 'human-rights',          strength: 2 },
  { source: 'misinformation',       target: 'state-conflict',        strength: 2 },
  { source: 'ai-outcomes',          target: 'misinformation',        strength: 3 },
  { source: 'ai-outcomes',          target: 'cyber-insecurity',      strength: 2 },
  { source: 'ai-outcomes',          target: 'inequality',            strength: 2 },
  { source: 'cyber-insecurity',     target: 'economic-downturn',     strength: 2 },
  { source: 'cyber-insecurity',     target: 'geo-confrontation',     strength: 2 },

  // Societal cluster
  { source: 'societal-polarization',target: 'human-rights',          strength: 2 },
  { source: 'societal-polarization',target: 'geo-confrontation',     strength: 2 },
  { source: 'inequality',           target: 'societal-polarization', strength: 3 },
  { source: 'inequality',           target: 'migration',             strength: 2 },
  { source: 'human-rights',         target: 'migration',             strength: 2 },

  // Economic cluster
  { source: 'economic-downturn',    target: 'inequality',            strength: 3 },
  { source: 'economic-downturn',    target: 'societal-polarization', strength: 2 },
  { source: 'resource-shortages',   target: 'economic-downturn',     strength: 2 },
  { source: 'resource-shortages',   target: 'state-conflict',        strength: 2 },

  // Environmental cluster
  { source: 'extreme-weather',      target: 'economic-downturn',     strength: 2 },
  { source: 'extreme-weather',      target: 'migration',             strength: 3 },
  { source: 'extreme-weather',      target: 'resource-shortages',    strength: 2 },
  { source: 'earth-systems',        target: 'extreme-weather',       strength: 3 },
  { source: 'earth-systems',        target: 'biodiversity',          strength: 3 },
  { source: 'biodiversity',         target: 'resource-shortages',    strength: 3 },
  { source: 'biodiversity',         target: 'extreme-weather',       strength: 2 },
  { source: 'pollution',            target: 'biodiversity',          strength: 2 },
  { source: 'pollution',            target: 'earth-systems',         strength: 2 },
];

// Reveal order: which edges to show first — grouped by narrative arc
// Geopolitical → Tech/Info → Societal → Economic → Environmental
export const EDGE_REVEAL_ORDER = [
  'geo-confrontation→state-conflict',
  'geo-confrontation→economic-downturn',
  'state-conflict→migration',
  'state-conflict→human-rights',
  'geo-confrontation→cyber-insecurity',
  'state-conflict→economic-downturn',
  'misinformation→societal-polarization',
  'ai-outcomes→misinformation',
  'ai-outcomes→cyber-insecurity',
  'cyber-insecurity→economic-downturn',
  'cyber-insecurity→geo-confrontation',
  'ai-outcomes→inequality',
  'misinformation→human-rights',
  'misinformation→state-conflict',
  'societal-polarization→human-rights',
  'inequality→societal-polarization',
  'inequality→migration',
  'human-rights→migration',
  'societal-polarization→geo-confrontation',
  'economic-downturn→inequality',
  'economic-downturn→societal-polarization',
  'resource-shortages→economic-downturn',
  'resource-shortages→state-conflict',
  'extreme-weather→economic-downturn',
  'extreme-weather→migration',
  'extreme-weather→resource-shortages',
  'earth-systems→extreme-weather',
  'earth-systems→biodiversity',
  'biodiversity→resource-shortages',
  'biodiversity→extreme-weather',
  'pollution→biodiversity',
  'pollution→earth-systems',
];
