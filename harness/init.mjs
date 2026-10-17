#!/usr/bin/env node
// Bootstrap the project: Node version, dependencies, env file, database, migrations, seed.
// Steps that depend on scripts not yet created are reported as TODO (create them via feature F-H-05).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
const sh = (cmd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 20 || (maj === 20 && min < 9)) { console.error(`Node ${process.versions.node} is too old: Next.js 16 needs >= 20.9. Install Node LTS.`); process.exit(1); }
const pkg = JSON.parse(readFileSync('package.json', 'utf8')); const has = (s) => Boolean(pkg.scripts && pkg.scripts[s]);
sh(existsSync('package-lock.json') ? 'npm ci' : 'npm install');
if (!existsSync('.env.local') && existsSync('.env.example')) {
  copyFileSync('.env.example', '.env.local');
  let env = readFileSync('.env.local', 'utf8');
  env = env.replace(/^NEXTAUTH_SECRET=.*$/m, `NEXTAUTH_SECRET="${randomBytes(32).toString('base64')}"`);
  writeFileSync('.env.local', env); console.log('Created .env.local with a fresh NEXTAUTH_SECRET (never commit it).');
}
const todo = [];
for (const s of ['db:up', 'db:migrate', 'db:seed']) { if (has(s)) sh(`npm run ${s}`); else todo.push(s); }
if (!has('db:migrate') && existsSync('prisma/schema.prisma')) sh('npx prisma generate');
if (todo.length) console.log(`\nTODO (create these npm scripts, feature F-H-05): ${todo.join(', ')}`);
console.log('\ninit complete');
