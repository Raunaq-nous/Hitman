#!/usr/bin/env node
// Verification gate.
//   --quick : feature list, lint, typecheck, unit tests
//   (none)  : adds next build and Playwright e2e
//   --ci    : like (none), but a missing npm script is SKIPPED until the feature that creates it is marked passing
//   --clean : init + full gate in a fresh git worktree
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const args = new Set(process.argv.slice(2));
if (args.has('--clean')) {
  const dir = `.worktrees/verify-${Date.now()}`;
  try {
    execSync(`git worktree add --detach ${dir} HEAD`, { stdio: 'inherit' });
    const r1 = spawnSync('node', ['harness/init.mjs'], { cwd: dir, stdio: 'inherit' });
    const r2 = r1.status === 0 ? spawnSync('node', ['harness/verify.mjs'], { cwd: dir, stdio: 'inherit' }) : r1;
    process.exitCode = r2.status ?? 1;
  } finally { execSync(`git worktree remove --force ${dir}`, { stdio: 'inherit' }); }
  process.exit(process.exitCode);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8')); const scripts = pkg.scripts || {};
const features = JSON.parse(readFileSync('harness/feature_list.json', 'utf8')).features;
const passing = new Set(features.filter((f) => f.passes).map((f) => f.id));
const createdBy = { typecheck: 'F-H-05', test: 'F-H-06', 'test:e2e': 'F-H-07', lint: null, build: null };
const steps = [['feature list', 'node harness/check-features.mjs', null], ['lint', 'npm run lint', 'lint'], ['typecheck', 'npm run typecheck', 'typecheck'], ['unit tests', 'npm test', 'test']];
if (!args.has('--quick')) steps.push(['build', 'npm run build', 'build'], ['e2e', 'npm run test:e2e', 'test:e2e']);
const results = [];
for (const [name, cmd, script] of steps) {
  if (script && !scripts[script]) {
    const owner = createdBy[script];
    if (args.has('--ci') && owner && !passing.has(owner)) { results.push([name, 'SKIP', `no "${script}" script yet (created by ${owner})`]); continue; }
    results.push([name, 'MISSING', `add an npm script "${script}"${owner ? ` (feature ${owner})` : ''}`]); continue;
  }
  console.log(`\n=== ${name}: ${cmd}`);
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', env: { ...process.env, CI: process.env.CI ?? '1' } });
  results.push([name, r.status === 0 ? 'PASS' : 'FAIL', cmd]);
  if (r.status !== 0) break;
}
console.log('\nVerification summary'); for (const [n, s, d] of results) console.log(`  ${s.padEnd(8)} ${n.padEnd(12)} ${d}`);
const ok = results.length === steps.length && results.every(([, s]) => s === 'PASS' || s === 'SKIP');
process.exit(ok ? 0 : 1);
