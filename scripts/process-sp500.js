import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../../Data/S&P500-Data.csv');
const outPath = resolve(__dirname, '../public/sp500-tree.json');

const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.trim().split('\n');

// Parse CSV respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const headers = parseCSVLine(lines[0]);
const rows = lines.slice(1).map(parseCSVLine);

// Build tree: S&P 500 → Sector → Sub-Industry → Company
const sectorMap = new Map();

rows.forEach((row) => {
  const [symbol, security, sector, subIndustry, hq, dateAdded, cik, founded] = row;
  if (!sector || !symbol) return;

  if (!sectorMap.has(sector)) sectorMap.set(sector, new Map());
  const subMap = sectorMap.get(sector);

  if (!subMap.has(subIndustry)) subMap.set(subIndustry, []);
  subMap.get(subIndustry).push({
    symbol,
    name: security,
    founded: founded || '',
    hq: hq || '',
  });
});

const tree = {
  id: 'sp500',
  label: 'S&P 500',
  children: [],
};

sectorMap.forEach((subMap, sectorName) => {
  const sectorNode = {
    id: `sector-${sectorName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    label: sectorName,
    children: [],
    companyCount: 0,
  };

  subMap.forEach((companies, subIndustryName) => {
    const subNode = {
      id: `sub-${subIndustryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      label: subIndustryName,
      children: companies.map((c) => ({
        id: `co-${c.symbol.toLowerCase()}`,
        label: c.symbol,
        fullName: c.name,
        founded: c.founded,
        hq: c.hq,
      })),
    };
    sectorNode.companyCount += companies.length;
    sectorNode.children.push(subNode);
  });

  tree.children.push(sectorNode);
});

writeFileSync(outPath, JSON.stringify(tree, null, 2));
console.log(`Written ${outPath}`);
console.log(`Sectors: ${tree.children.length}`);
console.log(`Sub-industries: ${tree.children.reduce((s, c) => s + c.children.length, 0)}`);
console.log(`Companies: ${tree.children.reduce((s, c) => s + c.companyCount, 0)}`);
