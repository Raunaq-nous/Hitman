#!/usr/bin/env node
// Courier step: copy small OpenF1 and StatsBomb samples into data/fixtures and write data/manifest.json with
// source URLs, download time, SHA-256 of every downloaded file and attribution. Raw files stay in data/raw (gitignored).
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const { downloadedAt } = JSON.parse(readFileSync('data/raw/when.json', 'utf8'));

mkdirSync('data/fixtures/openf1', { recursive: true });
for (const f of ['sessions-2023-race.json', 'laps.json', 'pit.json']) copyFileSync(`data/raw/openf1/${f}`, `data/fixtures/openf1/${f}`);
mkdirSync('data/fixtures/statsbomb', { recursive: true });
for (const f of readdirSync('data/raw/statsbomb')) {
  const src = `data/raw/statsbomb/${f}`;
  if (f.startsWith('events-')) writeFileSync(`data/fixtures/statsbomb/${f}.gz`, gzipSync(readFileSync(src), { level: 9 }));
  else copyFileSync(src, `data/fixtures/statsbomb/${f}`);
}

const SB = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data';
const openf1Key = JSON.parse(readFileSync('data/raw/openf1/sessions-2023-race.json', 'utf8'))[0].session_key;
const sources = [
  { sourceId: 'cricsheet', url: readFileSync('data/raw/cricsheet/url.txt', 'utf8').trim(), file: 'data/raw/cricsheet/ipl_json.zip', attribution: 'Data from Cricsheet (cricsheet.org)' },
  { sourceId: 'openf1', url: 'https://api.openf1.org/v1/sessions?year=2023&session_name=Race', file: 'data/raw/openf1/sessions-2023-race.json', attribution: 'Historical timing data from OpenF1 (openf1.org), an unofficial project not associated with Formula 1 companies' },
  { sourceId: 'openf1', url: `https://api.openf1.org/v1/laps?session_key=${openf1Key}`, file: 'data/raw/openf1/laps.json', attribution: 'OpenF1 (openf1.org)' },
  { sourceId: 'openf1', url: `https://api.openf1.org/v1/pit?session_key=${openf1Key}`, file: 'data/raw/openf1/pit.json', attribution: 'OpenF1 (openf1.org)' },
  ...readdirSync('data/raw/statsbomb').map((f) => ({ sourceId: 'statsbomb', url: `${SB}/${f === 'competitions.json' ? f : f.startsWith('matches-') ? `matches/${f.slice(8, -5).replace('-', '/')}.json` : `events/${f.slice(7)}`}`, file: `data/raw/statsbomb/${f}`, attribution: 'Event data provided by StatsBomb (open data)' })),
].map((s) => ({ ...s, bytes: statSync(s.file).size, sha256: sha(s.file), downloadedAt }));

const outputs = [];
for (const dir of ['data/fixtures/cricsheet', 'data/fixtures/openf1', 'data/fixtures/statsbomb', 'data/derived']) {
  for (const f of readdirSync(dir)) outputs.push({ file: `${dir}/${f}`, bytes: statSync(`${dir}/${f}`).size, sha256: sha(`${dir}/${f}`) });
}
writeFileSync('data/manifest.json', JSON.stringify({ downloadedAt, builtBy: 'data-courier workflow', sources: sources.map(({ file, ...s }) => ({ ...s, rawFile: file })), outputs }, null, 2) + '\n');
console.log(`manifest: ${sources.length} sources, ${outputs.length} outputs`);
