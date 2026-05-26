#!/usr/bin/env node
/**
 * UN General Assembly Ideal Point extraction script.
 * Produces public/un-voting.json with two view payloads:
 *   - alignmentData: 40 countries × 9 decade snapshots (IdealPointAll)
 *   - agreementData: 40 countries × 6 major powers (session 78 / 2023)
 *
 * Self-contained — does not modify any shared data files.
 * Run: node scripts/process-un-voting.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(
  __dirname,
  '../../Data/United Nations General Assembly Ideal Points/United Nations General Assembly Ideal Points- IdealpointestimatesAll_Jun2024.csv'
);
const OUT_PATH = path.join(__dirname, '../public/un-voting.json');

// ── Curated country list (40) ──
const CURATED = [
  'United States', 'Russia', 'China', 'Germany', 'France',
  'United Kingdom', 'Japan', 'India', 'Brazil', 'Canada',
  'Italy', 'Australia', 'Argentina', 'Mexico', 'South Africa',
  'Saudi Arabia', 'South Korea', 'Indonesia', 'Turkey', 'Poland',
  'Ukraine', 'Israel', 'Iran', 'Egypt', 'Nigeria',
  'Pakistan', 'Bangladesh', 'Ethiopia', 'Vietnam', 'Thailand',
  'Malaysia', 'Venezuela', 'Cuba', 'North Korea', 'Belarus',
  'Hungary', 'Switzerland', 'Sweden', 'Norway', 'Netherlands',
];
const curatedSet = new Set(CURATED);

// ── Decade snapshots (session = year - 1945) ──
const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2023];
const DECADE_SESSIONS = DECADES.map(y => y - 1945);

// ── Major powers for View B ──
const POWERS = ['USAgree', 'RUSSAgree', 'BrazilAgree', 'ChinaAgree', 'IndiaAgree', 'IsraelAgree'];
const POWER_LABELS = ['USA', 'Russia', 'Brazil', 'China', 'India', 'Israel'];
const LATEST_SESSION = 78; // 2023

// ── CSV parser (handles quoted fields) ──
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

// ── Main ──
console.log('Reading UN voting CSV …');
if (!fs.existsSync(CSV_PATH)) {
  console.error(`CSV not found: ${CSV_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n').filter(l => l.trim());
const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

// Resolve column indices
const col = {};
for (const name of ['session', 'Countryname', 'IdealPointAll', ...POWERS]) {
  const i = headers.indexOf(name);
  if (i === -1) { console.error(`Column "${name}" not found in CSV headers`); process.exit(1); }
  col[name] = i;
}
console.log('Column indices:', col);

// Parse all rows into a lookup: { [country]: { [session]: rowObj } }
const lookup = {};
for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const country = vals[col.Countryname]?.replace(/^"|"$/g, '');
  if (!curatedSet.has(country)) continue;

  const session = parseInt(vals[col.session]);
  if (isNaN(session)) continue;

  if (!lookup[country]) lookup[country] = {};
  lookup[country][session] = {
    idealPoint: parseFloat(vals[col.IdealPointAll]),
    usAgree:    parseFloat(vals[col.USAgree]),
    russAgree:  parseFloat(vals[col.RUSSAgree]),
    brazilAgree:parseFloat(vals[col.BrazilAgree]),
    chinaAgree: parseFloat(vals[col.ChinaAgree]),
    indiaAgree: parseFloat(vals[col.IndiaAgree]),
    israelAgree:parseFloat(vals[col.IsraelAgree]),
  };
}

const foundCountries = CURATED.filter(c => lookup[c]);
const missingCountries = CURATED.filter(c => !lookup[c]);
if (missingCountries.length > 0) {
  console.warn(`Countries not found in CSV: ${missingCountries.join(', ')}`);
}
console.log(`Found ${foundCountries.length} / ${CURATED.length} curated countries`);

// ── View A: Alignment Timeline ──
const alignmentData = foundCountries.map(country => {
  const sessions = lookup[country];
  const values = DECADE_SESSIONS.map(targetSession => {
    // Exact match first
    if (sessions[targetSession] && !isNaN(sessions[targetSession].idealPoint)) {
      return Math.round(sessions[targetSession].idealPoint * 1000) / 1000;
    }
    // Closest available session within ±3
    for (let delta = 1; delta <= 3; delta++) {
      for (const d of [targetSession + delta, targetSession - delta]) {
        if (sessions[d] && !isNaN(sessions[d].idealPoint)) {
          return Math.round(sessions[d].idealPoint * 1000) / 1000;
        }
      }
    }
    return null;
  });
  return { country, values };
});

// ── View B: Agreement Matrix (session 78 / 2023) ──
const agreementData = foundCountries.map(country => {
  const row = lookup[country]?.[LATEST_SESSION];
  const values = row
    ? [row.usAgree, row.russAgree, row.brazilAgree, row.chinaAgree, row.indiaAgree, row.israelAgree]
        .map(v => isNaN(v) ? null : Math.round(v * 1000) / 1000)
    : [null, null, null, null, null, null];
  return { country, values };
});

// ── Compute global min/max for alignment colour scale ──
const allIdealPoints = alignmentData.flatMap(d => d.values).filter(v => v !== null);
const idealMin = Math.min(...allIdealPoints);
const idealMax = Math.max(...allIdealPoints);

const output = {
  source: 'UN General Assembly Ideal Points (Bailey, Strezhnev & Voeten, Jun 2024)',
  latestYear: 2023,
  alignment: {
    decades: DECADES,
    countries: foundCountries,
    data: alignmentData,
    domain: [Math.round(idealMin * 100) / 100, Math.round(idealMax * 100) / 100],
  },
  agreement: {
    powers: POWER_LABELS,
    countries: foundCountries,
    data: agreementData,
    domain: [0, 1],
  },
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
const sizeKB = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
console.log(`\n✓ ${OUT_PATH}  (${sizeKB} KB)`);
console.log(`  Alignment: ${alignmentData.length} countries × ${DECADES.length} decades`);
console.log(`  Agreement: ${agreementData.length} countries × ${POWER_LABELS.length} powers`);

// Report null cells in View A
const nullCount = alignmentData.reduce((sum, d) => sum + d.values.filter(v => v === null).length, 0);
const totalCells = alignmentData.length * DECADES.length;
console.log(`  Null cells in alignment view: ${nullCount} / ${totalCells} (${(nullCount/totalCells*100).toFixed(1)}%)`);
