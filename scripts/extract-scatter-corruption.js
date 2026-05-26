#!/usr/bin/env node
/**
 * One-time script: extracts v2x_polyarchy (Electoral Democracy Index)
 * and v2x_corr (Political Corruption Index) from the full V-Dem CSV.
 *
 * Output: public/vdem-scatter-corruption.json
 * Self-contained — does not modify any shared data files.
 *
 * Run: node scripts/extract-scatter-corruption.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '../../Data/V-Dem-CY-Full+Others-v16.csv');
const OUT_PATH = path.join(__dirname, '../public/vdem-scatter-corruption.json');

// Columns we need
const NEEDED = ['country_name', 'country_text_id', 'year', 'v2x_polyarchy', 'v2x_corr', 'e_mipopula'];

// Region mapping (same as process-vdem.js)
const REGION_MAP = {
  'DZA': 'Africa', 'EGY': 'Africa', 'LBY': 'Africa', 'MAR': 'Africa', 'SDN': 'Africa', 'TUN': 'Africa',
  'AGO': 'Africa', 'BEN': 'Africa', 'BWA': 'Africa', 'BFA': 'Africa', 'BDI': 'Africa', 'CMR': 'Africa',
  'CPV': 'Africa', 'CAF': 'Africa', 'TCD': 'Africa', 'COM': 'Africa', 'COG': 'Africa', 'COD': 'Africa',
  'CIV': 'Africa', 'DJI': 'Africa', 'GNQ': 'Africa', 'ERI': 'Africa', 'SWZ': 'Africa', 'ETH': 'Africa',
  'GAB': 'Africa', 'GMB': 'Africa', 'GHA': 'Africa', 'GIN': 'Africa', 'GNB': 'Africa', 'KEN': 'Africa',
  'LSO': 'Africa', 'LBR': 'Africa', 'MDG': 'Africa', 'MWI': 'Africa', 'MLI': 'Africa', 'MRT': 'Africa',
  'MUS': 'Africa', 'MOZ': 'Africa', 'NAM': 'Africa', 'NER': 'Africa', 'NGA': 'Africa', 'RWA': 'Africa',
  'STP': 'Africa', 'SEN': 'Africa', 'SYC': 'Africa', 'SLE': 'Africa', 'SOM': 'Africa', 'ZAF': 'Africa',
  'SSD': 'Africa', 'TZA': 'Africa', 'TGO': 'Africa', 'UGA': 'Africa', 'ZMB': 'Africa', 'ZWE': 'Africa',
  'CAN': 'Americas', 'USA': 'Americas', 'MEX': 'Americas',
  'BLZ': 'Americas', 'CRI': 'Americas', 'SLV': 'Americas', 'GTM': 'Americas', 'HND': 'Americas', 'NIC': 'Americas', 'PAN': 'Americas',
  'ARG': 'Americas', 'BOL': 'Americas', 'BRA': 'Americas', 'CHL': 'Americas', 'COL': 'Americas', 'ECU': 'Americas',
  'GUY': 'Americas', 'PRY': 'Americas', 'PER': 'Americas', 'SUR': 'Americas', 'URY': 'Americas', 'VEN': 'Americas',
  'ATG': 'Americas', 'BHS': 'Americas', 'BRB': 'Americas', 'CUB': 'Americas', 'DMA': 'Americas', 'DOM': 'Americas',
  'GRD': 'Americas', 'HTI': 'Americas', 'JAM': 'Americas', 'KNA': 'Americas', 'LCA': 'Americas', 'VCT': 'Americas',
  'TTO': 'Americas',
  'CHN': 'Asia', 'HKG': 'Asia', 'JPN': 'Asia', 'KOR': 'Asia', 'MNG': 'Asia', 'PRK': 'Asia', 'TWN': 'Asia',
  'AFG': 'Asia', 'BGD': 'Asia', 'BTN': 'Asia', 'IND': 'Asia', 'IRN': 'Asia', 'KAZ': 'Asia', 'KGZ': 'Asia',
  'MDV': 'Asia', 'NPL': 'Asia', 'PAK': 'Asia', 'LKA': 'Asia', 'TJK': 'Asia', 'TKM': 'Asia', 'UZB': 'Asia',
  'BRN': 'Asia', 'KHM': 'Asia', 'IDN': 'Asia', 'LAO': 'Asia', 'MYS': 'Asia', 'MMR': 'Asia', 'PHL': 'Asia',
  'SGP': 'Asia', 'THA': 'Asia', 'TLS': 'Asia', 'VNM': 'Asia',
  'ARE': 'Asia', 'ARM': 'Asia', 'AZE': 'Asia', 'BHR': 'Asia', 'CYP': 'Asia', 'GEO': 'Asia', 'IRQ': 'Asia',
  'ISR': 'Asia', 'JOR': 'Asia', 'KWT': 'Asia', 'LBN': 'Asia', 'OMN': 'Asia', 'PSE': 'Asia', 'QAT': 'Asia',
  'SAU': 'Asia', 'SYR': 'Asia', 'TUR': 'Asia', 'YEM': 'Asia',
  'BLR': 'Europe', 'BGR': 'Europe', 'CZE': 'Europe', 'HUN': 'Europe', 'POL': 'Europe', 'MDA': 'Europe',
  'ROU': 'Europe', 'RUS': 'Europe', 'SVK': 'Europe', 'UKR': 'Europe',
  'DNK': 'Europe', 'EST': 'Europe', 'FIN': 'Europe', 'ISL': 'Europe', 'IRL': 'Europe', 'LVA': 'Europe',
  'LTU': 'Europe', 'NOR': 'Europe', 'SWE': 'Europe', 'GBR': 'Europe',
  'ALB': 'Europe', 'AND': 'Europe', 'BIH': 'Europe', 'HRV': 'Europe', 'GRC': 'Europe', 'ITA': 'Europe',
  'MLT': 'Europe', 'MNE': 'Europe', 'PRT': 'Europe', 'SRB': 'Europe', 'SVN': 'Europe',
  'ESP': 'Europe', 'MKD': 'Europe', 'KOS': 'Europe',
  'AUT': 'Europe', 'BEL': 'Europe', 'FRA': 'Europe', 'DEU': 'Europe', 'LIE': 'Europe', 'LUX': 'Europe',
  'NLD': 'Europe', 'CHE': 'Europe',
  'AUS': 'Oceania', 'FJI': 'Oceania', 'NZL': 'Oceania', 'PNG': 'Oceania',
  'WSM': 'Oceania', 'SLB': 'Oceania', 'TON': 'Oceania', 'TUV': 'Oceania', 'VUT': 'Oceania',
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

console.log('Reading V-Dem CSV …');
if (!fs.existsSync(CSV_PATH)) {
  console.error(`CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

// Resolve column indices
const idx = {};
for (const col of NEEDED) {
  const i = headers.indexOf(col);
  if (i === -1) { console.error(`Column "${col}" not found`); process.exit(1); }
  idx[col] = i;
}
console.log('Column indices resolved:', Object.fromEntries(Object.entries(idx).map(([k,v]) => [k,v])));

// Pass 1: find the latest year that has data for both indices
const yearSet = new Set();
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const yr = parseInt(vals[idx.year]);
  const poly = parseFloat(vals[idx.v2x_polyarchy]);
  const corr = parseFloat(vals[idx.v2x_corr]);
  if (yr && !isNaN(poly) && !isNaN(corr)) yearSet.add(yr);
}
const latestYear = Math.max(...yearSet);
console.log(`Latest year with both indices: ${latestYear}`);

// Pass 2: extract rows for the latest year
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const yr = parseInt(vals[idx.year]);
  if (yr !== latestYear) continue;

  const poly = parseFloat(vals[idx.v2x_polyarchy]);
  const corr = parseFloat(vals[idx.v2x_corr]);
  if (isNaN(poly) || isNaN(corr)) continue;

  const code = vals[idx.country_text_id]?.replace(/^"|"$/g, '');
  const name = vals[idx.country_name]?.replace(/^"|"$/g, '');
  const pop = parseFloat(vals[idx.e_mipopula]);

  rows.push({
    country: name,
    code,
    democracy: Math.round(poly * 1000) / 1000,
    corruption: Math.round(corr * 1000) / 1000,
    population: isNaN(pop) ? null : pop,
    region: REGION_MAP[code] || 'Other',
  });
}

rows.sort((a, b) => a.country.localeCompare(b.country));

const output = {
  year: latestYear,
  source: 'V-Dem Institute v16',
  axes: {
    x: { key: 'democracy', label: 'Electoral Democracy Index (v2x_polyarchy)', range: [0, 1] },
    y: { key: 'corruption', label: 'Political Corruption Index (v2x_corr)', range: [0, 1] },
  },
  countries: rows,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
const sizeMB = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`✓ ${OUT_PATH}  (${sizeMB} KB, ${rows.length} countries, year ${latestYear})`);
