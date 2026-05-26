#!/usr/bin/env node
/**
 * Global Peace Index extraction script.
 * Joins 4 CSVs (semicolon-delimited, European decimal commas) on cname+year,
 * filters to ~35 curated countries, assigns regions + population, and outputs
 * public/gpi-bubbles.json for the BubbleChart visualization.
 *
 * Run: node scripts/process-gpi.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../Data/Global Peace Index');
const OUT_PATH = path.join(__dirname, '../public/gpi-bubbles.json');

// ── CSV files and their score column ──
const FILES = [
  { file: 'qogdata_26_05_2026-Global Peace Index.csv', col: 'gpi_gpi', key: 'gpi' },
  { file: 'qogdata_26_05_2026-Ongoing Conflict.csv', col: 'gpi_conf', key: 'conflict' },
  { file: 'qogdata_26_05_2026-Militarization.csv', col: 'gpi_mil', key: 'militarization' },
  { file: 'qogdata_26_05_2026-Safety and Security.csv', col: 'gpi_ss', key: 'safety' },
];

// ── Country name normalisation (plan name → CSV name) ──
const NAME_MAP = {
  'Russia': 'Russian Federation (the)',
  'United States': 'United States of America (the)',
  'United Kingdom': 'United Kingdom of Great Britain and Northern Ireland (the)',
  'South Korea': 'Korea (the Republic of)',
  'Iran': 'Iran (Islamic Republic of)',
  'Syria': 'Syrian Arab Republic (the)',
  'Venezuela': 'Venezuela (Bolivarian Republic of)',
};

// Reverse map for output labels
const LABEL_MAP = Object.fromEntries(Object.entries(NAME_MAP).map(([k, v]) => [v, k]));

// ── Curated countries with region + population (millions, 2023 est) ──
const CURATED = [
  // Europe
  { name: 'Germany', region: 'Europe', pop: 84.1 },
  { name: 'France', region: 'Europe', pop: 68.2 },
  { name: 'United Kingdom', region: 'Europe', pop: 69.6 },
  { name: 'Sweden', region: 'Europe', pop: 10.5 },
  { name: 'Norway', region: 'Europe', pop: 5.5 },
  { name: 'Finland', region: 'Europe', pop: 5.6 },
  { name: 'Poland', region: 'Europe', pop: 37.6 },
  { name: 'Hungary', region: 'Europe', pop: 9.6 },
  { name: 'Russia', region: 'Europe', pop: 144.2 },
  // Middle East
  { name: 'Israel', region: 'Middle East', pop: 9.8 },
  { name: 'Saudi Arabia', region: 'Middle East', pop: 36.9 },
  { name: 'Iran', region: 'Middle East', pop: 89.2 },
  { name: 'Turkey', region: 'Middle East', pop: 85.8 },
  { name: 'Yemen', region: 'Middle East', pop: 34.4 },
  { name: 'Syria', region: 'Middle East', pop: 23.2 },
  // Americas
  { name: 'United States', region: 'Americas', pop: 341.8 },
  { name: 'Canada', region: 'Americas', pop: 41.0 },
  { name: 'Brazil', region: 'Americas', pop: 216.4 },
  { name: 'Mexico', region: 'Americas', pop: 129.4 },
  { name: 'Venezuela', region: 'Americas', pop: 28.4 },
  { name: 'Colombia', region: 'Americas', pop: 52.7 },
  // Asia-Pacific
  { name: 'China', region: 'Asia-Pacific', pop: 1425.7 },
  { name: 'Japan', region: 'Asia-Pacific', pop: 123.3 },
  { name: 'India', region: 'Asia-Pacific', pop: 1428.6 },
  { name: 'Australia', region: 'Asia-Pacific', pop: 26.6 },
  { name: 'South Korea', region: 'Asia-Pacific', pop: 51.7 },
  { name: 'Pakistan', region: 'Asia-Pacific', pop: 240.5 },
  { name: 'Afghanistan', region: 'Asia-Pacific', pop: 42.2 },
  // Africa
  { name: 'South Africa', region: 'Africa', pop: 60.4 },
  { name: 'Nigeria', region: 'Africa', pop: 223.8 },
  { name: 'Egypt', region: 'Africa', pop: 112.7 },
  { name: 'Ethiopia', region: 'Africa', pop: 126.5 },
  // Other
  { name: 'Ukraine', region: 'Europe', pop: 37.0 },
];

// Build lookup: CSV name → curated entry
const csvNameToCurated = new Map();
for (const c of CURATED) {
  const csvName = NAME_MAP[c.name] || c.name;
  csvNameToCurated.set(csvName, c);
}

// ── Parse semicolon-delimited CSV with European decimal commas ──
function parseCSV(filePath, scoreCol) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(';');
  const nameIdx = headers.indexOf('cname');
  const yearIdx = headers.indexOf('year');
  const scoreIdx = headers.indexOf(scoreCol);

  if (nameIdx === -1 || yearIdx === -1 || scoreIdx === -1) {
    console.error(`Missing column in ${filePath}: nameIdx=${nameIdx}, yearIdx=${yearIdx}, scoreIdx=${scoreIdx}`);
    process.exit(1);
  }

  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const cname = cols[nameIdx];
    const year = parseInt(cols[yearIdx]);
    const rawScore = cols[scoreIdx]?.replace(',', '.');
    const score = parseFloat(rawScore);

    if (!cname || isNaN(year)) continue;
    if (!csvNameToCurated.has(cname)) continue;

    const key = `${cname}|${year}`;
    if (!result[key]) result[key] = { cname, year };
    result[key].score = isNaN(score) ? null : Math.round(score * 1000) / 1000;
  }
  return result;
}

// ── Main ──
console.log('Processing GPI data …');

// Parse all 4 CSVs
const datasets = {};
for (const { file, col, key } of FILES) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  datasets[key] = parseCSV(filePath, col);
  console.log(`  Parsed ${file} → ${Object.keys(datasets[key]).length} rows`);
}

// Join all scores into one lookup
const joined = {}; // key: "cname|year" → { cname, year, gpi, conflict, militarization, safety }
const allKeys = new Set([
  ...Object.keys(datasets.gpi),
  ...Object.keys(datasets.conflict),
  ...Object.keys(datasets.militarization),
  ...Object.keys(datasets.safety),
]);

for (const k of allKeys) {
  const base = datasets.gpi[k] || datasets.conflict[k] || datasets.militarization[k] || datasets.safety[k];
  if (!base) continue;
  joined[k] = {
    cname: base.cname,
    year: base.year,
    gpi: datasets.gpi[k]?.score ?? null,
    conflict: datasets.conflict[k]?.score ?? null,
    militarization: datasets.militarization[k]?.score ?? null,
    safety: datasets.safety[k]?.score ?? null,
  };
}

// Build output grouped by year
const years = [];
for (let y = 2008; y <= 2025; y++) years.push(y);

const data = {};
for (const year of years) {
  data[year] = [];
  for (const curated of CURATED) {
    const csvName = NAME_MAP[curated.name] || curated.name;
    const key = `${csvName}|${year}`;
    const row = joined[key];
    if (!row || row.militarization === null || row.safety === null) continue;

    data[year].push({
      country: curated.name,
      region: curated.region,
      population: curated.pop,
      gpi: row.gpi,
      conflict: row.conflict,
      militarization: row.militarization,
      safety: row.safety,
    });
  }
}

const output = {
  source: 'Institute for Economics & Peace — Global Peace Index (via QoG, 2008–2025)',
  years,
  data,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
const sizeKB = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`\n✓ ${OUT_PATH}  (${sizeKB} KB)`);
console.log(`  Years: ${years[0]}–${years[years.length - 1]} (${years.length} snapshots)`);
console.log(`  Countries per year: ${Object.values(data).map(d => d.length).join(', ')}`);

// Check for NaN
let nanCount = 0;
for (const year of years) {
  for (const row of data[year]) {
    for (const field of ['gpi', 'conflict', 'militarization', 'safety']) {
      if (row[field] === null || isNaN(row[field])) nanCount++;
    }
  }
}
console.log(`  Null/NaN values: ${nanCount}`);
