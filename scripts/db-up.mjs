#!/usr/bin/env node
// Start the local PostgreSQL database named in DATABASE_URL.
// Order: already reachable → docker compose (db service) → embedded-postgres (no Docker needed).
//   node scripts/db-up.mjs            start in the background and wait until it accepts connections
//   node scripts/db-up.mjs --foreground  run embedded-postgres in this process (used by the background mode)
import { spawn, spawnSync } from 'node:child_process';
import { connect } from 'node:net';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
const raw = process.env.DATABASE_URL;
if (!raw) { console.error('DATABASE_URL is not set. Run node harness/init.mjs to create .env.local.'); process.exit(1); }
const url = new URL(raw);
const host = url.hostname; const port = Number(url.port || 5432);
const user = decodeURIComponent(url.username); const password = decodeURIComponent(url.password);
const database = url.pathname.replace(/^\//, '') || 'postgres';
const dataDir = `${process.cwd()}/.data/postgres`;

const reachable = () => new Promise((resolve) => {
  const s = connect({ host, port }); s.setTimeout(1000);
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false)); s.once('timeout', () => { s.destroy(); resolve(false); });
});
const waitFor = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await reachable()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };

async function foreground() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const pg = new EmbeddedPostgres({ databaseDir: dataDir, user, password, port, persistent: true, createPostgresUser: process.getuid?.() === 0, onLog: () => {}, onError: () => {} });
  if (!existsSync(`${dataDir}/PG_VERSION`)) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase(database); } catch { /* already exists */ }
  const stop = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  setInterval(() => {}, 1 << 30);
}

async function main() {
  if (process.argv.includes('--foreground')) return foreground();
  if (await reachable()) { console.log(`database already reachable at ${host}:${port}`); return; }
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.error(`DATABASE_URL points at ${host}; db:up only starts local databases.`); process.exit(1); }
  if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0) {
    const r = spawnSync('docker', ['compose', 'up', '-d', '--wait', 'db'], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log('database started with docker compose'); return;
  }
  mkdirSync('.data', { recursive: true });
  const log = openSync('.data/postgres.log', 'a');
  const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--foreground'], { detached: true, stdio: ['ignore', log, log] });
  child.unref();
  if (!(await waitFor(60_000))) { console.error('embedded-postgres did not start; see .data/postgres.log'); process.exit(1); }
  // the port opens before createDatabase finishes; give it a moment
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`database started with embedded-postgres (pid ${child.pid}, data in ${dataDir})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
