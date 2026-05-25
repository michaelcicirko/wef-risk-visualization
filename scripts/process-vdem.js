#!/usr/bin/env node
/**
 * V-Dem Data Processing Script
 * Extracts key democracy indices from the full V-Dem CSV
 * Output: src/data/vdemDemocracy.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../../Data/V-Dem-CY-Full+Others-v16.csv');
const OUTPUT_PATH = path.join(__dirname, '../src/data/vdemDemocracy.js');

// Key columns to extract
// UN Geographic Regions mapping for all V-Dem countries
const REGION_MAP = {
  // Africa (Northern)
  'DZA': 'Africa', 'EGY': 'Africa', 'LBY': 'Africa', 'MAR': 'Africa', 'SDN': 'Africa', 'TUN': 'Africa',
  // Africa (Sub-Saharan)
  'AGO': 'Africa', 'BEN': 'Africa', 'BWA': 'Africa', 'BFA': 'Africa', 'BDI': 'Africa', 'CMR': 'Africa',
  'CPV': 'Africa', 'CAF': 'Africa', 'TCD': 'Africa', 'COM': 'Africa', 'COG': 'Africa', 'COD': 'Africa',
  'CIV': 'Africa', 'DJI': 'Africa', 'GNQ': 'Africa', 'ERI': 'Africa', 'SWZ': 'Africa', 'ETH': 'Africa',
  'GAB': 'Africa', 'GMB': 'Africa', 'GHA': 'Africa', 'GIN': 'Africa', 'GNB': 'Africa', 'KEN': 'Africa',
  'LSO': 'Africa', 'LBR': 'Africa', 'MDG': 'Africa', 'MWI': 'Africa', 'MLI': 'Africa', 'MRT': 'Africa',
  'MUS': 'Africa', 'MOZ': 'Africa', 'NAM': 'Africa', 'NER': 'Africa', 'NGA': 'Africa', 'RWA': 'Africa',
  'STP': 'Africa', 'SEN': 'Africa', 'SYC': 'Africa', 'SLE': 'Africa', 'SOM': 'Africa', 'ZAF': 'Africa',
  'SSD': 'Africa', 'TZA': 'Africa', 'TGO': 'Africa', 'UGA': 'Africa', 'ZMB': 'Africa', 'ZWE': 'Africa',
  'ZAN': 'Africa', 'MAY': 'Africa', 'BRI': 'Africa', 'FRW': 'Africa', 'GBW': 'Africa', 'GWC': 'Africa',
  'GRW': 'Africa', 'GRT': 'Africa', 'ORW': 'Africa', 'SAH': 'Africa', 'TRZ': 'Africa', 'BRG': 'Africa',
  'BEA': 'Africa', 'BBO': 'Africa', 'BSE': 'Africa', 'GNS': 'Africa', 'PML': 'Africa', 'PRS': 'Africa',
  'SIE': 'Africa', 'SIP': 'Africa', 'CEF': 'Africa', 'CGB': 'Africa', 'RUC': 'Africa', 'RUZ': 'Africa',
  'RWA': 'Africa', 'SUA': 'Africa',
  // Americas (North America)
  'CAN': 'Americas', 'USA': 'Americas', 'MEX': 'Americas',
  // Americas (Central America)
  'BLZ': 'Americas', 'CRI': 'Americas', 'SLV': 'Americas', 'GTM': 'Americas', 'HND': 'Americas', 'NIC': 'Americas', 'PAN': 'Americas',
  // Americas (South America)
  'ARG': 'Americas', 'BOL': 'Americas', 'BRA': 'Americas', 'CHL': 'Americas', 'COL': 'Americas', 'ECU': 'Americas',
  'GUY': 'Americas', 'PRY': 'Americas', 'PER': 'Americas', 'SUR': 'Americas', 'URY': 'Americas', 'VEN': 'Americas',
  'ABW': 'Americas', 'CUW': 'Americas', 'SXM': 'Americas',
  // Americas (Caribbean)
  'ATG': 'Americas', 'BHS': 'Americas', 'BRB': 'Americas', 'CUB': 'Americas', 'DMA': 'Americas', 'DOM': 'Americas',
  'GRD': 'Americas', 'HTI': 'Americas', 'JAM': 'Americas', 'KNA': 'Americas', 'LCA': 'Americas', 'VCT': 'Americas',
  'TTO': 'Americas',
  // Asia (Eastern)
  'CHN': 'Asia', 'HKG': 'Asia', 'JPN': 'Asia', 'KOR': 'Asia', 'MAC': 'Asia', 'MNG': 'Asia', 'PRK': 'Asia',
  'KOR': 'Asia', 'TWN': 'Asia',
  // Asia (South-central)
  'AFG': 'Asia', 'BGD': 'Asia', 'BTN': 'Asia', 'IND': 'Asia', 'IRN': 'Asia', 'KAZ': 'Asia', 'KGZ': 'Asia',
  'MDV': 'Asia', 'NPL': 'Asia', 'PAK': 'Asia', 'LKA': 'Asia', 'TJK': 'Asia', 'TKM': 'Asia', 'UZB': 'Asia',
  // Asia (South-eastern)
  'BRN': 'Asia', 'KHM': 'Asia', 'IDN': 'Asia', 'LAO': 'Asia', 'MYS': 'Asia', 'MMR': 'Asia', 'PHL': 'Asia',
  'SGP': 'Asia', 'THA': 'Asia', 'TLS': 'Asia', 'VNM': 'Asia',
  // Asia (Western / Middle East)
  'ARE': 'Asia', 'ARM': 'Asia', 'AZE': 'Asia', 'BHR': 'Asia', 'CYP': 'Asia', 'GEO': 'Asia', 'IRQ': 'Asia',
  'ISR': 'Asia', 'JOR': 'Asia', 'KWT': 'Asia', 'LBN': 'Asia', 'OMN': 'Asia', 'PSE': 'Asia', 'QAT': 'Asia',
  'SAU': 'Asia', 'SYR': 'Asia', 'TUR': 'Asia', 'YEM': 'Asia',
  // Europe (Eastern)
  'BLR': 'Europe', 'BGR': 'Europe', 'CZE': 'Europe', 'HUN': 'Europe', 'POL': 'Europe', 'MDA': 'Europe',
  'ROU': 'Europe', 'RUS': 'Europe', 'SVK': 'Europe', 'UKR': 'Europe',
  // Europe (Northern)
  'DNK': 'Europe', 'EST': 'Europe', 'FIN': 'Europe', 'ISL': 'Europe', 'IRL': 'Europe', 'LVA': 'Europe',
  'LTU': 'Europe', 'NOR': 'Europe', 'SWE': 'Europe', 'GBR': 'Europe',
  // Europe (Southern)
  'ALB': 'Europe', 'AND': 'Europe', 'BIH': 'Europe', 'HRV': 'Europe', 'GRC': 'Europe', 'ITA': 'Europe',
  'MLT': 'Europe', 'MNE': 'Europe', 'PRT': 'Europe', 'SMR': 'Europe', 'SRB': 'Europe', 'SVN': 'Europe',
  'ESP': 'Europe', 'MKD': 'Europe', 'YUG': 'Europe', 'SCG': 'Europe', 'GIC': 'Europe', 'SCG': 'Europe',
  'YPR': 'Europe', 'YAR': 'Europe', 'MAC': 'Europe', 'KOS': 'Europe',
  // Europe (Western)
  'AUT': 'Europe', 'BEL': 'Europe', 'FRA': 'Europe', 'DEU': 'Europe', 'LIE': 'Europe', 'LUX': 'Europe',
  'MCO': 'Europe', 'NLD': 'Europe', 'CHE': 'Europe', 'GFR': 'Europe', 'GDR': 'Europe', 'BAD': 'Europe',
  'BAV': 'Europe', 'HAM': 'Europe', 'HSE': 'Europe', 'PRU': 'Europe', 'SAX': 'Europe', 'WU1': 'Europe',
  'SIC': 'Europe', 'PMA': 'Europe', 'SAR': 'Europe', 'SIC': 'Europe', 'TUS': 'Europe', 'VEN': 'Europe',
  'MOD': 'Europe', 'LUC': 'Europe', 'PAP': 'Europe', 'SIC': 'Europe', 'TUS': 'Europe', 'MOD': 'Europe',
  'PMA': 'Europe', 'SAR': 'Europe', 'LUC': 'Europe', 'PAP': 'Europe', 'WRT': 'Europe',
  // Oceania
  'AUS': 'Oceania', 'FJI': 'Oceania', 'KIR': 'Oceania', 'MHL': 'Oceania', 'FSM': 'Oceania', 'NRU': 'Oceania',
  'NZL': 'Oceania', 'PLW': 'Oceania', 'PNG': 'Oceania', 'WSM': 'Oceania', 'SLB': 'Oceania', 'TON': 'Oceania',
  'TUV': 'Oceania', 'VUT': 'Oceania',
};

const COLUMNS_TO_EXTRACT = [
  'country_name',
  'country_text_id',
  'country_id',
  'year',
  'v2x_polyarchy',      // Electoral democracy index
  'v2x_libdem',         // Liberal democracy index
  'v2x_partipdem',      // Participatory democracy index
  'v2x_delibdem',       // Deliberative democracy index
  'v2x_egaldem',        // Egalitarian democracy index
  'v2x_api',            // Alternative democracy index (access plus information)
  'v2x_mpi',            // Multiplicative polyarchy index
  'v2x_freexp_altinf',  // Freedom of expression and alternative information
  'v2x_frassoc_thick',  // Freedom of association (thick)
  'v2x_suffr',          // Suffrage
  'v2xel_frefair',      // Free and fair elections
  'v2x_elecoff',        // Elected officials
  'v2x_liberal',        // Liberal component
  'v2xcl_rol',          // Equality before the law and individual liberty
  'v2x_jucon',          // Judicial constraints on the executive
  'v2xlg_legcon',       // Legislative constraints on the executive
  'v2x_partip',         // Participatory component
  'v2x_cspart',         // Civil society participation
  'v2xdd_dd',           // Direct democracy
  'v2xel_locelec',      // Local government elections
  'v2xel_regelec',      // Regional government elections
  'v2xdl_delib',        // Deliberative component
  'v2x_egal',           // Egalitarian component
  'v2xeg_eqprotec',     // Equal protection
  'v2xeg_eqaccess',     // Equal access
  'e_migdppc',          // GDP per capita (constant 2011 USD)
  'e_mipopula',         // Population (thousands)
  'e_migdpgro',         // GDP growth rate
];

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function processData() {
  console.log('Reading V-Dem CSV...');
  
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`Total lines: ${lines.length}`);

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  console.log(`Total columns in CSV: ${headers.length}`);

  // Get column indices
  const columnIndices = {};
  const missingColumns = [];
  
  COLUMNS_TO_EXTRACT.forEach(col => {
    const idx = headers.indexOf(col);
    if (idx === -1) {
      missingColumns.push(col);
    } else {
      columnIndices[col] = idx;
    }
  });

  if (missingColumns.length > 0) {
    console.warn(`Warning: ${missingColumns.length} columns not found:`, missingColumns);
  }

  console.log(`Extracting ${Object.keys(columnIndices).length} columns...`);

  // Process data rows
  const data = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    if (values.length < headers.length) {
      skippedRows++;
      continue;
    }

    const row = {};
    let hasValidData = false;

    Object.entries(columnIndices).forEach(([col, idx]) => {
      const value = values[idx]?.replace(/^"|"$/g, '');
      
      // Convert numeric columns
      if (col === 'year' || col === 'country_id') {
        row[col] = parseInt(value) || null;
      } else if (['country_name', 'country_text_id'].includes(col)) {
        row[col] = value || '';
      } else {
        // Democracy indices and other numeric fields
        const num = parseFloat(value);
        row[col] = isNaN(num) ? null : num;
        if (!isNaN(num)) hasValidData = true;
      }
    });

    // Add region based on country code
    if (row.country_text_id) {
      row.region = REGION_MAP[row.country_text_id] || 'Other';
    }

    // Only include rows with valid year and at least one democracy score
    if (row.year && hasValidData) {
      data.push(row);
    }
  }

  console.log(`Processed ${data.length} valid rows (skipped ${skippedRows})`);

  // Get unique countries
  const countries = [...new Map(data.map(d => [d.country_id, {
    id: d.country_id,
    name: d.country_name,
    code: d.country_text_id,
    region: d.region
  }])).values()].sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Unique countries: ${countries.length}`);

  // Get year range
  const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
  console.log(`Year range: ${years[0]} - ${years[years.length - 1]}`);

  // Calculate region counts
  const regionCounts = {};
  countries.forEach(c => {
    regionCounts[c.region] = (regionCounts[c.region] || 0) + 1;
  });

  // Build output
  const output = {
    metadata: {
      source: 'V-Dem Institute v16',
      extractedAt: new Date().toISOString(),
      totalRecords: data.length,
      countries: countries.length,
      yearRange: [years[0], years[years.length - 1]],
      columns: [...Object.keys(columnIndices), 'region'],
      regions: regionCounts
    },
    countries,
    years,
    data
  };

  // Generate JavaScript file
  const jsContent = `// V-Dem Democracy Data
// Source: V-Dem Institute v16
// Extracted: ${output.metadata.extractedAt}
// Total Records: ${output.metadata.totalRecords}
// Countries: ${output.metadata.countries}
// Year Range: ${output.metadata.yearRange[0]} - ${output.metadata.yearRange[1]}

export const VDEM_METADATA = ${JSON.stringify(output.metadata, null, 2)};

export const VDEM_COUNTRIES = ${JSON.stringify(output.countries, null, 2)};

export const VDEM_YEARS = ${JSON.stringify(output.years, null, 2)};

export const VDEM_DATA = ${JSON.stringify(output.data, null, 2)};

// Helper functions
export function getCountryData(countryId) {
  return VDEM_DATA.filter(d => d.country_id === countryId);
}

export function getYearData(year) {
  return VDEM_DATA.filter(d => d.year === year);
}

export function getCountryById(countryId) {
  return VDEM_COUNTRIES.find(c => c.id === countryId);
}

export function getDemocracyScore(countryId, year, index = 'v2x_libdem') {
  const record = VDEM_DATA.find(d => d.country_id === countryId && d.year === year);
  return record ? record[index] : null;
}

// Democracy indices available
export const DEMOCRACY_INDICES = [
  { key: 'v2x_polyarchy', name: 'Electoral Democracy', description: 'Minimum electoral democracy' },
  { key: 'v2x_libdem', name: 'Liberal Democracy', description: 'Comprehensive liberal democracy' },
  { key: 'v2x_partipdem', name: 'Participatory Democracy', description: 'Participatory component' },
  { key: 'v2x_delibdem', name: 'Deliberative Democracy', description: 'Deliberative component' },
  { key: 'v2x_egaldem', name: 'Egalitarian Democracy', description: 'Egalitarian component' },
];

// Get average score for a country across all years
export function getCountryAverage(countryId, index = 'v2x_libdem') {
  const countryData = getCountryData(countryId);
  const validScores = countryData.map(d => d[index]).filter(v => v !== null);
  if (validScores.length === 0) return null;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

// Get global average for a year
export function getGlobalAverage(year, index = 'v2x_libdem') {
  const yearData = getYearData(year);
  const validScores = yearData.map(d => d[index]).filter(v => v !== null);
  if (validScores.length === 0) return null;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

// Get countries by region
export function getCountriesByRegion(region) {
  return VDEM_COUNTRIES.filter(c => c.region === region);
}

// Get data filtered by region
export function getRegionData(region, year = null) {
  const countryIds = getCountriesByRegion(region).map(c => c.id);
  if (year) {
    return VDEM_DATA.filter(d => countryIds.includes(d.country_id) && d.year === year);
  }
  return VDEM_DATA.filter(d => countryIds.includes(d.country_id));
}

// Get regional average for a year
export function getRegionalAverage(region, year, index = 'v2x_libdem') {
  const regionData = getRegionData(region, year);
  const validScores = regionData.map(d => d[index]).filter(v => v !== null);
  if (validScores.length === 0) return null;
  return validScores.reduce((a, b) => a + b, 0) / validScores.length;
}

// Available regions
export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Other'];
`

  // Ensure directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, jsContent, 'utf-8');
  
  console.log(`\n✓ Successfully created: ${OUTPUT_PATH}`);
  console.log(`  File size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nNext steps:`);
  console.log(`  1. Verify the output file looks correct`);
  console.log(`  2. Import the data in your visualization: import { VDEM_DATA, VDEM_COUNTRIES } from '../data/vdemDemocracy.js'`);
}

processData();
