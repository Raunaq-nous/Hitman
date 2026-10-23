#!/usr/bin/env node
// Run a command with .env.local then .env loaded (Prisma's CLI only reads .env). Existing variables win.
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
config({ quiet: true });
const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) { console.error('usage: node scripts/with-env.mjs <command> [args...]'); process.exit(2); }
const r = spawnSync(cmd, rest, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
