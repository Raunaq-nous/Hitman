#!/usr/bin/env node
// Courier step: bowling styles for IPL bowlers from Wikidata (CC0), keyed through Cricsheet's people register.
// Never guesses: a bowler without a Wikidata bowling-style statement has an empty style. Records the property used,
// coverage and query time in <out>/bowling-styles.meta.json.
//   node scripts/courier/bowling-styles.mjs <ipl_json dir> <out dir>
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [rawDir = 'data/raw/cricsheet/ipl_json', outDir = 'data/derived'] = process.argv.slice(2);
const UA = { 'User-Agent': 'ALTER-EGO-data-courier/0.1 (https://github.com/Raunaq-nous/Hitman)' };
const meta = { source: 'Wikidata (CC0) via Cricsheet people register', fetchedAt: new Date().toISOString() };
const done = (status, extra = {}) => { writeFileSync(join(outDir, 'bowling-styles.meta.json'), JSON.stringify({ ...meta, status, ...extra }, null, 2) + '\n'); console.log(status, JSON.stringify(extra).slice(0, 300)); };

// 1. bowlers' Cricsheet ids from the match files' registries
const bowlers = new Map();
for (const f of readdirSync(rawDir).filter((x) => /^\d+\.json$/.test(x))) {
  const m = JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
  const reg = m.info?.registry?.people ?? {};
  for (const inn of m.innings ?? []) for (const o of inn.overs ?? []) for (const d of o.deliveries) if (reg[d.bowler]) bowlers.set(reg[d.bowler], d.bowler);
}
// 2. Cricsheet register → ESPNcricinfo ids
const regUrl = 'https://cricsheet.org/register/people.csv';
const reg = await (await fetch(regUrl, { headers: UA })).text();
const [head, ...rows] = reg.trim().split('\n').map((l) => l.split(','));
const iId = head.indexOf('identifier'), iCi = head.indexOf('key_cricinfo');
const cricinfo = new Map(rows.map((r) => [r[iId], r[iCi]]).filter(([, c]) => c));
meta.register = { url: regUrl, sha256: createHash('sha256').update(reg).digest('hex') };
// 3. the bowling-style property, found by its label (not guessed)
const search = await (await fetch('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=bowling%20style&language=en&type=property&format=json', { headers: UA })).json();
const prop = (search.search ?? []).find((p) => /bowling style/i.test(p.label ?? ''));
meta.propertyCandidates = (search.search ?? []).map((p) => ({ id: p.id, label: p.label, description: p.description }));
if (!prop) { done('no-property'); process.exit(0); }
meta.property = { id: prop.id, label: prop.label, description: prop.description };
// 4. styles by ESPNcricinfo id (P2697), in batches
const ids = [...bowlers.keys()].map((b) => [b, cricinfo.get(b)]).filter(([, c]) => c);
const styles = new Map();
for (let i = 0; i < ids.length; i += 150) {
  const values = ids.slice(i, i + 150).map(([, c]) => `"${c}"`).join(' ');
  const q = `SELECT ?id ?item ?styleLabel WHERE { VALUES ?id { ${values} } ?item wdt:P2697 ?id . OPTIONAL { ?item wdt:${prop.id} ?style . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q), { headers: { ...UA, Accept: 'application/sparql-results+json' } });
  if (!r.ok) { done('query-failed', { httpStatus: r.status }); process.exit(0); }
  for (const b of (await r.json()).results.bindings) {
    const prev = styles.get(b.id.value) ?? { item: b.item.value.split('/').pop(), styles: new Set() };
    if (b.styleLabel?.value) prev.styles.add(b.styleLabel.value);
    styles.set(b.id.value, prev);
  }
  await new Promise((res) => setTimeout(res, 1000));
}
// 5. compact table
const csv = (v) => (/[",\n]/.test(v ?? '') ? `"${v.replace(/"/g, '""')}"` : v ?? '');
const lines = ['cricsheet_id,name,cricinfo_id,wikidata,bowling_style'];
for (const [cs, name] of [...bowlers.entries()].sort()) {
  const ci = cricinfo.get(cs) ?? '', w = styles.get(ci);
  lines.push([cs, name, ci, w?.item ?? '', w ? [...w.styles].sort().join('; ') : ''].map(csv).join(','));
}
writeFileSync(join(outDir, 'bowling-styles.csv'), lines.join('\n') + '\n');
const withStyle = lines.slice(1).filter((l) => !l.endsWith(',')).length;
done('ok', { bowlers: bowlers.size, withCricinfoId: ids.length, withWikidataItem: styles.size, withStyle });
