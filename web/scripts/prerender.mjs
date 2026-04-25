#!/usr/bin/env node
/**
 * Prerender all public routes into static HTML files.
 *
 * Strategy:
 *   1. Read sitemap.xml from production (or PRERENDER_PROD_BASE env var)
 *   2. Start `vite preview` locally on 127.0.0.1:4173 — serves the freshly built dist/
 *      with /api proxied to production zencodio.com/api so React can fetch real data
 *   3. Launch headless Chromium (puppeteer)
 *   4. For each public path, visit localhost, wait for content + react-helmet, save HTML
 *      to dist/<path>/index.html
 *   5. Nginx's existing `try_files $uri $uri/ /index.html` will serve the prerendered
 *      file for crawlers AND users — JS hydrates on top, no UX change
 *
 * Run after `npm run build`:
 *   PRERENDER_PROD_BASE=https://zencodio.com node scripts/prerender.mjs
 */
import puppeteer from 'puppeteer';
import { preview } from 'vite';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PROD_BASE = process.env.PRERENDER_PROD_BASE || 'https://zencodio.com';
const LOCAL_HOST = '127.0.0.1';
const LOCAL_PORT = 4173;
const TIMEOUT_MS = 30000;
const WAIT_AFTER_LOAD_MS = 800;
const CONCURRENCY = parseInt(process.env.PRERENDER_CONCURRENCY || '6', 10);

// Routes that should NEVER be prerendered (auth-gated, dashboard, admin, dynamic actions)
const SKIP_PATTERNS = [
  /^\/login/, /^\/register/, /^\/forgot-password/, /^\/reset-password/,
  /^\/admin/, /^\/dashboard/, /^\/practice/, /^\/tests/,
  /^\/analytics/, /^\/mistakes/, /^\/leaderboard/, /^\/profile/,
  /^\/study-planner/, /^\/subscription/, /^\/coding(\/|$)/,
  /^\/interview-prep/, /^\/daily-quiz/, /^\/pyq/, /^\/challenges/,
  /^\/scheduled-tests/, /^\/export-pdf/, /^\/custom-test/, /^\/refer/,
];

const log = (msg) => console.log(msg);

async function fetchSitemapPaths() {
  const url = `${PROD_BASE}/sitemap.xml`;
  log(`→ Fetching sitemap: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch sitemap (${res.status}). Is the server up?`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const paths = urls.map(u => {
    try { return new URL(u).pathname; } catch { return null; }
  }).filter(Boolean);
  return [...new Set(paths)].filter(p => !SKIP_PATTERNS.some(rx => rx.test(p)));
}

async function ensureDist() {
  if (!existsSync(DIST)) {
    throw new Error(`dist/ not found at ${DIST} — run 'npm run build' first`);
  }
  if (!existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(`dist/index.html missing — build appears incomplete`);
  }
}

async function startPreview() {
  log(`→ Starting Vite preview on http://${LOCAL_HOST}:${LOCAL_PORT} (with /api proxy → ${PROD_BASE})`);
  const server = await preview({
    configFile: false,
    root: ROOT,
    preview: {
      port: LOCAL_PORT,
      host: LOCAL_HOST,
      strictPort: true,
      proxy: {
        '/api': {
          target: PROD_BASE,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  });
  return server;
}

async function renderOne(browser, pathname) {
  const url = `http://${LOCAL_HOST}:${LOCAL_PORT}${pathname}`;
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (compatible; ExamPrepPrerender/1.0)');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: TIMEOUT_MS });
    // Allow react-helmet-async + any final state updates to settle
    await new Promise((r) => setTimeout(r, WAIT_AFTER_LOAD_MS));
    return await page.content();
  } finally {
    await page.close();
  }
}

async function savePrerender(pathname, html) {
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  const outDir = cleanPath === '/' ? DIST : path.join(DIST, cleanPath);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf-8');
}

async function processBatch(browser, batch, total, indexOffset) {
  await Promise.all(batch.map(async (p, i) => {
    const idx = indexOffset + i + 1;
    const label = `[${String(idx).padStart(3)}/${total}] ${p}`;
    try {
      const html = await renderOne(browser, p);
      await savePrerender(p, html);
      log(`  ✓ ${label}`);
    } catch (err) {
      log(`  ✗ ${label} — ${err.message.slice(0, 60)}`);
      throw err; // bubble up but Promise.allSettled would suppress; use try/catch with counter
    }
  }));
}

async function main() {
  const t0 = Date.now();
  await ensureDist();

  const paths = await fetchSitemapPaths();
  log(`  Found ${paths.length} public routes`);

  const server = await startPreview();

  log(`→ Launching headless Chromium`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  let success = 0, failed = 0;
  for (let i = 0; i < paths.length; i += CONCURRENCY) {
    const batch = paths.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(async (p) => {
      const html = await renderOne(browser, p);
      await savePrerender(p, html);
      return p;
    }));
    results.forEach((r, j) => {
      const idx = i + j + 1;
      const p = batch[j];
      const label = `[${String(idx).padStart(3)}/${paths.length}] ${p}`;
      if (r.status === 'fulfilled') {
        log(`  ✓ ${label}`);
        success++;
      } else {
        const msg = (r.reason?.message || String(r.reason)).slice(0, 80);
        log(`  ✗ ${label} — ${msg}`);
        failed++;
      }
    });
  }

  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((err) => (err ? reject(err) : resolve()))
  );

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log('');
  log(`✓ Prerender complete in ${elapsed}s — ${success} succeeded, ${failed} failed`);
  if (failed > 0 && success === 0) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
