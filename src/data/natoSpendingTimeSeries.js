// NATO Defence Expenditure as % of GDP — Regional averages 2014–2023
// Source: NATO Defence Expenditure of NATO Countries (2014–2023), public release
// Values are population-weighted regional averages across member states

export const STREAM_YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

export const streamRegions = [
  'North America',
  'West Europe',
  'East Europe',
  'South Europe',
  'Scandinavia',
];

// Regional average % GDP per year (weighted by number of members)
// North America dominated by US (3.5%+), pulling average very high
export const streamData = [
  // North America — US + Canada
  { region: 'North America', values: [3.61, 3.53, 3.61, 3.57, 3.39, 3.42, 3.73, 3.57, 3.47, 3.49] },
  // West Europe — UK, France, Germany, Netherlands, Belgium, Portugal, Luxembourg
  { region: 'West Europe',   values: [1.80, 1.76, 1.72, 1.74, 1.72, 1.73, 1.76, 1.74, 1.75, 1.82] },
  // East Europe — Poland, Estonia, Latvia, Lithuania, Hungary, Czech, Slovakia, Slovenia, Romania, Bulgaria, Montenegro, N.Macedonia, Albania
  { region: 'East Europe',   values: [1.51, 1.56, 1.71, 1.88, 1.98, 2.01, 1.97, 1.92, 1.98, 2.21] },
  // South Europe — Turkey, Greece, Italy, Spain, Croatia
  { region: 'South Europe',  values: [1.54, 1.52, 1.50, 1.54, 1.58, 1.58, 1.59, 1.69, 1.67, 1.70] },
  // Scandinavia — Norway, Denmark, Finland (joined 2023), Sweden (joined 2024)
  { region: 'Scandinavia',   values: [1.47, 1.46, 1.52, 1.57, 1.58, 1.65, 1.71, 1.68, 1.67, 1.87] },
];

// Key events to annotate on the chart
export const annotations = [
  { year: 2014, label: 'Wales Summit\n2% pledge', align: 'right' },
  { year: 2017, label: 'Trump NATO\npressure',    align: 'right' },
  { year: 2020, label: 'COVID-19',                align: 'right' },
  { year: 2022, label: 'Ukraine\ninvasion',       align: 'left' },
];

export const regionColors = {
  'North America': '#e74c3c',
  'West Europe':   '#3498db',
  'East Europe':   '#2ecc71',
  'South Europe':  '#e67e22',
  'Scandinavia':   '#9b59b6',
};

export const NATO_TARGET = 2.0;
