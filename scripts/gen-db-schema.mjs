#!/usr/bin/env node
// Regenerate docs/generated/db-schema.md from prisma/schema.prisma (run by doc gardening).
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('prisma/schema.prisma', 'utf8');
const out = ['# Database schema (generated)', '', 'Generated from `prisma/schema.prisma` by `node scripts/gen-db-schema.mjs`. Do not edit by hand.', ''];
for (const m of src.matchAll(/^(?:\/\/\/[^\n]*\n)*(model|enum) (\w+) \{([\s\S]*?)^\}/gm)) {
  const doc = m[0].split('\n').filter((l) => l.startsWith('///')).map((l) => l.slice(3).trim()).join(' ');
  out.push(`## ${m[2]}${m[1] === 'enum' ? ' (enum)' : ''}`, '');
  if (doc) out.push(doc, '');
  out.push('| Field | Type | Attributes |', '|---|---|---|');
  const block = [];
  for (const line of m[3].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'))) {
    if (line.startsWith('@@')) { block.push(line); continue; }
    const [name, type = '', ...attrs] = line.split(/\s+/);
    out.push(`| ${name} | ${type} | ${attrs.join(' ').replace(/\|/g, '\\|')} |`);
  }
  if (block.length) out.push('', ...block.map((b) => `- \`${b}\``));
  out.push('');
}
writeFileSync('docs/generated/db-schema.md', out.join('\n'));
console.log('wrote docs/generated/db-schema.md');
