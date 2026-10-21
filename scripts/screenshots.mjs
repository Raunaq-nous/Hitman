#!/usr/bin/env node
// UI evidence: headless screenshots at 390 and 1280 px, light and dark.
//   node scripts/screenshots.mjs <feature-id> <name>=<path> [<name>=<path> ...]
// Saves docs/evidence/<feature-id>/<name>-<width>-<theme>.png. Starts `next start` on :3300 unless BASE_URL is set
// (run `npm run build` first). Uses the VM's preinstalled Chromium when present.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const [feature, ...pages] = process.argv.slice(2);
if (!feature || pages.length === 0) { console.error('usage: node scripts/screenshots.mjs <feature-id> <name>=<path> ...'); process.exit(2); }
const base = process.env.BASE_URL ?? 'http://localhost:3300';
let server;
if (!process.env.BASE_URL) {
  server = spawn('node', ['scripts/with-env.mjs', 'npx', 'next', 'start', '-p', '3300'], { stdio: 'ignore', detached: true, env: { ...process.env, DESIGN_GALLERY: 'true' } });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).status < 500) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }
}
const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(local) ? { executablePath: local } : {});
const dir = `docs/evidence/${feature}`; mkdirSync(dir, { recursive: true });
try {
  for (const spec of pages) {
    const [name, path] = spec.split('=');
    for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, colorScheme: theme, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto(base + path, { waitUntil: 'networkidle' });
      const file = `${dir}/${name}-${width}-${theme}.png`;
      await page.screenshot({ path: file, fullPage: process.env.FULL_PAGE === '1' });
      console.log(file);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
