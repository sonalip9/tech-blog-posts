#!/usr/bin/env node
// Renders the SVG sources in this folder to PNG with headless Chrome.
// No dependencies. Needs Node 22 or newer (built-in WebSocket) and Google Chrome.
// The brand fonts (Libre Baskerville, Atkinson Hyperlegible) load from Google Fonts,
// so you need to be online.
//
//   node render-images.mjs
//   CHROME="/path/to/chrome" node render-images.mjs      # pick a browser
//   CHROME_FLAGS="--no-sandbox" node render-images.mjs   # extra Chrome flags (CI, containers)
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// name, CSS width, CSS height, device scale factor
const IMAGES = [
  ['cover', 1600, 840, 1],
  ['repo-layout', 720, 440, 2],
  ['seam', 720, 340, 2],
];
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Atkinson+Hyperlegible:wght@400;700&display=swap';
const WANTED_FONTS = ['Libre Baskerville', 'Atkinson Hyperlegible'];

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((path) => existsSync(path));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (typeof WebSocket === 'undefined') throw new Error('Node 22 or newer is required.');
  const chromePath = findChrome();
  if (!chromePath) throw new Error('Chrome not found. Set CHROME to its path.');

  const work = mkdtempSync(join(tmpdir(), 'render-images-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${join(work, 'profile')}`,
      ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : []),
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    // Chrome writes its debugging port to this file once it is ready.
    const portFile = join(work, 'profile', 'DevToolsActivePort');
    let port;
    for (let i = 0; i < 100 && !port; i += 1) {
      if (existsSync(portFile)) port = readFileSync(portFile, 'utf8').split('\n')[0];
      else await sleep(100);
    }
    if (!port) throw new Error('Chrome did not start.');

    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });

    let nextId = 1;
    const pending = new Map();
    const waiters = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      } else if (message.method) {
        for (const waiter of [...waiters]) {
          if (waiter.method === message.method) {
            waiters.splice(waiters.indexOf(waiter), 1);
            waiter.resolve(message.params);
          }
        }
      }
    };
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    const waitFor = (method) => new Promise((resolve) => waiters.push({ method, resolve }));

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);

    for (const [name, width, height, scale] of IMAGES) {
      const svg = readFileSync(join(here, `${name}.svg`), 'utf8').replace(/^<\?xml[^>]*>\s*/, '');
      const page = join(work, `${name}.html`);
      writeFileSync(
        page,
        `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${FONTS_URL}">` +
          `<style>html,body{margin:0;background:#FBF7F0}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`,
      );

      await send(
        'Emulation.setDeviceMetricsOverride',
        { width, height, deviceScaleFactor: scale, mobile: false },
        sessionId,
      );
      const loaded = waitFor('Page.loadEventFired');
      await send('Page.navigate', { url: pathToFileURL(page).href }, sessionId);
      await loaded;

      // Wait for the web fonts, then confirm the brand fonts really loaded.
      const fontReport = await send(
        'Runtime.evaluate',
        {
          awaitPromise: true,
          returnByValue: true,
          expression: `Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 10000))])
            .then(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))`,
        },
        sessionId,
      );
      const loadedFonts = fontReport.result.value ?? [];
      const missing = WANTED_FONTS.filter((font) => !loadedFonts.includes(font));

      const shot = await send(
        'Page.captureScreenshot',
        { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } },
        sessionId,
      );
      writeFileSync(join(here, `${name}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`wrote ${name}.png (${width * scale}x${height * scale})`);
      if (missing.length > 0 && name !== 'repo-layout' && name !== 'seam') {
        console.warn(`  warning: ${missing.join(', ')} did not load; this image uses fallback fonts.`);
      }
      if (missing.includes('Atkinson Hyperlegible') && (name === 'repo-layout' || name === 'seam')) {
        console.warn('  warning: Atkinson Hyperlegible did not load; this image uses a fallback font.');
      }
    }
    socket.close();
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
