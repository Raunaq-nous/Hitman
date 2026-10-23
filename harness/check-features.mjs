#!/usr/bin/env node
// Validates harness/feature_list.json: schema, unique ids, dependencies, evidence for passing features.
import { readFileSync } from 'node:fs';
const list = JSON.parse(readFileSync(new URL('./feature_list.json', import.meta.url), 'utf8'));
const errors = []; const ids = new Set(); const byId = new Map();
for (const f of list.features) {
  for (const k of ['id', 'phase', 'title', 'acceptance', 'verify', 'depends_on', 'passes', 'evidence']) if (!(k in f)) errors.push(`${f.id ?? '?'}: missing field ${k}`);
  if (ids.has(f.id)) errors.push(`duplicate id ${f.id}`); ids.add(f.id); byId.set(f.id, f);
  if (!Array.isArray(f.acceptance) || f.acceptance.length === 0) errors.push(`${f.id}: acceptance must be a non-empty list`);
  if (typeof f.passes !== 'boolean') errors.push(`${f.id}: passes must be boolean`);
  if (f.passes && (!f.evidence || String(f.evidence).trim().length < 20)) errors.push(`${f.id}: passing features need evidence (commands, test names, screenshot paths)`);
}
for (const f of list.features) for (const d of f.depends_on) {
  if (!byId.has(d)) errors.push(`${f.id}: unknown dependency ${d}`);
  else if (f.passes && !byId.get(d).passes) errors.push(`${f.id} passes but dependency ${d} does not`);
}
const total = list.features.length, done = list.features.filter((f) => f.passes).length;
const phases = {}; for (const f of list.features) { phases[f.phase] ??= [0, 0]; phases[f.phase][1]++; if (f.passes) phases[f.phase][0]++; }
console.log(`features: ${done}/${total} passing`); for (const [p, [a, b]] of Object.entries(phases)) console.log(`  phase ${p}: ${a}/${b}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
