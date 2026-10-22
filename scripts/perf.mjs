#!/usr/bin/env node
// Performance budgets (F-U-07): LCP on a mid-range mobile profile and gzipped route JS, measured with Playwright + CDP.
//   node scripts/perf.mjs / /desk [/lab]   (run `npm run build` first; starts `next start` on :3300 unless BASE_URL is set)
// Profile: 412×915 viewport, 4× CPU slowdown, 1.6 Mbps down / 750 kbps up / 150 ms RTT (Lighthouse "slow 4G" class).
// Budgets (docs/FRONTEND.md): LCP ≤ 2500 ms; route JS ≤ 200 KB gzipped. Prints JSON and exits 1 if a budget is missed.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

const paths = process.argv.slice(2);
if (paths.length === 0) { console.error('usage: node scripts/perf.mjs <path> [...]'); process.exit(2); }
const base = process.env.BASE_URL ?? 'http://localhost:3300';
let server;
if (!process.env.BASE_URL) {
  server = spawn('node', ['scripts/with-env.mjs', 'npx', 'next', 'start', '-p', '3300'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).status < 500) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 500)); }
}
const local = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(local) ? { executablePath: local } : {});
const RUNS = Number(process.env.PERF_RUNS ?? 3);
const results = [];
try {
  for (const path of paths) {
    const lcps = []; let jsGzip = 0; let status = 0;
    for (let run = 0; run < RUNS; run++) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const js = new Map();
      cdp.on('Network.responseReceived', (e) => { if (e.type === 'Script') js.set(e.requestId, 0); });
      cdp.on('Network.loadingFinished', (e) => { if (js.has(e.requestId)) js.set(e.requestId, e.encodedDataLength); });
      const res = await page.goto(base + path, { waitUntil: 'load' });
      status = res?.status() ?? 0;
      const lcp = await page.evaluate(() => new Promise((resolve) => {
        let last = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) last = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve(last), 3000);
      }));
      lcps.push(Math.round(lcp));
      jsGzip = [...js.values()].reduce((a, b) => a + b, 0);
      await ctx.close();
    }
    const median = [...lcps].sort((a, b) => a - b)[Math.floor(lcps.length / 2)];
    results.push({ path, status, lcpMs: median, lcpRunsMs: lcps, routeJsKbTransferred: Math.round(jsGzip / 1024), lcpOk: status === 200 && median <= 2500, jsOk: jsGzip <= 200 * 1024 });
  }
} finally {
  await browser.close();
  if (server) try { process.kill(-server.pid); } catch { /* already gone */ }
}
console.log(JSON.stringify({ profile: '412x915, 4x CPU, 1.6 Mbps/750 kbps, 150 ms RTT, cache disabled', runs: RUNS, results }, null, 2));
process.exit(results.every((r) => r.lcpOk && r.jsOk) ? 0 : 1);
