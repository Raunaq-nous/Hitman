#!/usr/bin/env node
// Copy a small, representative subset of downloaded Cricsheet IPL files into data/fixtures/cricsheet/:
// at least one tie, one rain-affected match (target revised by a method) and normal results, spread across seasons.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const src = process.argv[2] ?? 'data/raw/cricsheet/ipl_json';
const out = 'data/fixtures/cricsheet';
const files = readdirSync(src).filter((f) => /^\d+\.json$/.test(f)).sort();
const info = files.map((f) => ({ f, ...JSON.parse(readFileSync(`${src}/${f}`, 'utf8')).info }));
const tie = info.find((m) => m.outcome?.result === 'tie');
const rain = info.find((m) => typeof m.outcome?.method === 'string');
const bySeason = new Map();
for (const m of info) if (m.outcome?.winner && !m.outcome?.method && !bySeason.has(String(m.season))) bySeason.set(String(m.season), m);
const seasons = [...bySeason.keys()].sort();
const normal = [seasons[0], seasons[Math.floor(seasons.length / 2)], seasons.at(-3), seasons.at(-2), seasons.at(-1)].filter(Boolean).map((s) => bySeason.get(s));
const chosen = [...new Map([tie, rain, ...normal].filter(Boolean).map((m) => [m.f, m])).values()];
if (!tie || !rain || chosen.length < 5) { console.error('could not find a tie, a rain-affected match and enough results'); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const m of chosen) copyFileSync(`${src}/${m.f}`, `${out}/${m.f}`);
writeFileSync(`${out}/MANIFEST.json`, JSON.stringify({ source: 'https://cricsheet.org/downloads/ipl_json.zip', attribution: 'Data from Cricsheet (cricsheet.org)', files: chosen.map((m) => ({ file: m.f, season: String(m.season), teams: m.teams, outcome: m.outcome })) }, null, 2) + '\n');
console.log(`selected ${chosen.length} fixtures into ${out}`);
