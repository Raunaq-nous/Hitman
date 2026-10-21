#!/usr/bin/env node
// Verification gate. Prints a pass/fail summary plus the tail of the first failure (max 60 lines).
//   --quick : feature list, lint, typecheck, unit tests
//   (none)  : adds next build and Playwright e2e
//   --ci    : like (none), but a missing npm script is SKIPPED until the feature that creates it is marked passing
//   --clean : init + full gate in a fresh git worktree
//   --verbose : stream every command's output
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const args = new Set(process.argv.slice(2));
const verbose = args.has('--verbose');
const MAX_LINES = 60;
const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: verbose ? 'inherit' : 'pipe', ...opts });
  return { status: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};
const tail = (text) => text.replace(/\x1b\[[0-9;]*m/g, '').trimEnd().split('\n').slice(-MAX_LINES).join('\n');
if (args.has('--clean')) {
  const dir = `.worktrees/verify-${Date.now()}`;
  let status = 1;
  try {
    execSync(`git worktree add --detach ${dir} HEAD`, { stdio: 'pipe' });
    const init = run('node harness/init.mjs', { cwd: dir });
    if (init.status !== 0) { console.log(`FAIL     init\n--- first failure (last ${MAX_LINES} lines) ---\n${tail(init.out)}`); }
    else { console.log('PASS     init'); status = spawnSync('node', ['harness/verify.mjs', ...(verbose ? ['--verbose'] : [])], { cwd: dir, stdio: 'inherit' }).status ?? 1; }
  } finally { execSync(`git worktree remove --force ${dir}`, { stdio: 'pipe' }); }
  process.exit(status);
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8')); const scripts = pkg.scripts || {};
const features = JSON.parse(readFileSync('harness/feature_list.json', 'utf8')).features;
const passing = new Set(features.filter((f) => f.passes).map((f) => f.id));
const createdBy = { typecheck: 'F-H-05', test: 'F-H-06', 'test:e2e': 'F-H-07', lint: null, build: null };
const steps = [['feature list', 'node harness/check-features.mjs', null], ['lint', 'npm run lint --silent', 'lint'], ['typecheck', 'npm run typecheck --silent', 'typecheck'], ['unit tests', 'npm test --silent', 'test']];
if (!args.has('--quick')) steps.push(['build', 'npm run build --silent', 'build'], ['e2e', 'npm run test:e2e --silent', 'test:e2e']);
const results = []; let failure = null;
for (const [name, cmd, script] of steps) {
  if (script && !scripts[script]) {
    const owner = createdBy[script];
    if (args.has('--ci') && owner && !passing.has(owner)) { results.push([name, 'SKIP', `no "${script}" script yet (created by ${owner})`]); continue; }
    results.push([name, 'MISSING', `add an npm script "${script}"${owner ? ` (feature ${owner})` : ''}`]); break;
  }
  const t0 = Date.now();
  const r = run(cmd, { env: { ...process.env, CI: process.env.CI ?? '1' } });
  results.push([name, r.status === 0 ? 'PASS' : 'FAIL', `${cmd} (${((Date.now() - t0) / 1000).toFixed(1)}s)`]);
  if (r.status !== 0) { failure = [name, r.out]; break; }
}
console.log('Verification summary'); for (const [n, s, d] of results) console.log(`  ${s.padEnd(8)} ${n.padEnd(12)} ${d}`);
if (failure && !verbose) console.log(`--- first failure: ${failure[0]} (last ${MAX_LINES} lines) ---\n${tail(failure[1])}`);
const ok = results.length === steps.length && results.every(([, s]) => s === 'PASS' || s === 'SKIP');
console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
