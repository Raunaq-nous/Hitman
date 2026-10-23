#!/usr/bin/env node
// Download Cricsheet ball-by-ball JSON (IPL by default) into data/raw/cricsheet/<set>/ (gitignored).
// Cricsheet data is free to use under its terms (https://cricsheet.org/); tests never call this — they use data/fixtures/.
//   npm run data:cricsheet [-- --set ipl_json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
const i = process.argv.indexOf('--set');
const set = i > 0 ? process.argv[i + 1] : 'ipl_male_json';
if (!/^[a-z0-9_]+$/.test(set)) { console.error(`invalid set name: ${set}`); process.exit(2); }
const url = `https://cricsheet.org/downloads/${set}.zip`;
// stored as ipl_json whatever Cricsheet calls the archive, so ingest and fixture scripts find it
const dir = `data/raw/cricsheet/${set === 'ipl_male_json' ? 'ipl_json' : set}`;
const res = await fetch(url).catch((e) => ({ ok: false, status: String(e.cause?.code ?? e.message) }));
if (!res.ok) { console.error(`download failed (${res.status}) for ${url}; check network access to cricsheet.org`); process.exit(1); }
const zip = new Uint8Array(await res.arrayBuffer());
const sha256 = createHash('sha256').update(zip).digest('hex');
const files = unzipSync(zip);
mkdirSync(dir, { recursive: true });
let n = 0;
for (const [name, bytes] of Object.entries(files)) {
  if (name.includes('/') || name.includes('..')) continue;
  writeFileSync(`${dir}/${name}`, bytes); n++;
}
writeFileSync(`${dir}/.fetched.json`, JSON.stringify({ url, fetchedAt: new Date().toISOString(), bytes: zip.length, sha256, files: n }, null, 2));
console.log(`cricsheet: wrote ${n} files to ${dir}`);
