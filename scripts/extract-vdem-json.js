#!/usr/bin/env node
/**
 * One-time script: extracts VDEM_DATA from vdemDemocracy.js and writes
 * it as a pure JSON array to public/vdem-data.json.
 *
 * Run: node scripts/extract-vdem-json.js
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src/data/vdemDemocracy.js');
const OUT = path.join(__dirname, '../public/vdem-data.json');

console.log('Reading vdemDemocracy.js …');

// The file is a JS module — we read it as text and extract the JSON array
// by locating the VDEM_DATA = [ ... ] assignment.
const src = readFileSync(SRC, 'utf-8');

// Find the start of the VDEM_DATA array literal
const startToken = 'export const VDEM_DATA = ';
const startIdx = src.indexOf(startToken);
if (startIdx === -1) {
  console.error('ERROR: Could not find "export const VDEM_DATA = " in vdemDemocracy.js');
  process.exit(1);
}

// The value starts right after the token — find the matching closing bracket
let i = startIdx + startToken.length;
if (src[i] !== '[') {
  console.error('ERROR: VDEM_DATA value does not start with "[". Found:', src.slice(i, i + 20));
  process.exit(1);
}

let depth = 0;
let endIdx = -1;
for (; i < src.length; i++) {
  if (src[i] === '[') depth++;
  else if (src[i] === ']') {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}

if (endIdx === -1) {
  console.error('ERROR: Could not find the closing "]" for VDEM_DATA.');
  process.exit(1);
}

const arrayText = src.slice(startIdx + startToken.length, endIdx + 1);

console.log('Parsing JSON array …');
let data;
try {
  data = JSON.parse(arrayText);
} catch (e) {
  console.error('ERROR: JSON.parse failed:', e.message);
  process.exit(1);
}

console.log(`Records: ${data.length}`);
writeFileSync(OUT, JSON.stringify(data), 'utf-8');

const sizeMB = (statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`✓ Written: ${OUT}  (${sizeMB} MB)`);
