import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('out');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.css': 'text/css', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff2': 'font/woff2' };
let server;
let base = process.env.BAR_BASE_URL;
if (!base) {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/play/' || url.pathname === '/import/') {
        response.writeHead(308, { Location: url.pathname.slice(0, -1) + url.search });
        response.end(); return;
      }
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Outside export');
      if (file === root) file = path.join(root, 'index.html');
      if (!path.extname(file)) file += '.html';
      let status = 200;
      try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); }
      catch { file = path.join(root, '404.html'); status = 404; }
      response.writeHead(status, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
      response.end(await readFile(file));
    } catch { response.writeHead(500); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const origin = new URL(base).origin;
const key = 'frontend::QuickplayCharacters';
const initial = { characters: { 'legacy-id-a': 'Migration Ada', 'legacy-id-b': 'Migration Borin' } };
const storageState = process.env.BAR_LOAD_STORAGE
  ? JSON.parse(await readFile(process.env.BAR_LOAD_STORAGE, 'utf8'))
  : { cookies: [], origins: [{ origin, localStorage: [{ name: key, value: JSON.stringify(initial) }] }] };
const stored = storageState.origins.find(x => x.origin === origin)?.localStorage.find(x => x.name === key);
assert.ok(stored, 'The saved browser origin and storage key must match the website');
const expected = JSON.parse(stored.value);
const initialNames = Object.values(expected.characters);
assert.equal(initialNames.length, 2, 'Use the two-character synthetic migration fixture');
const args = process.env.BAR_ORIGIN_IP
  ? [`--host-resolver-rules=MAP ${new URL(base).hostname} ${process.env.BAR_ORIGIN_IP}`] : [];
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const errors = [];
  const failedAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/_next/') && response.status() >= 400) failedAssets.push(response.url());
  });
  async function names() {
    return await page.getByPlaceholder('Enter character name').evaluateAll(nodes => nodes.map(n => n.value));
  }
  async function waitForNames(want) {
    await page.waitForFunction(values => {
      const actual = [...document.querySelectorAll('input[placeholder="Enter character name"]')].map(n => n.value);
      return JSON.stringify(actual.slice().sort()) === JSON.stringify(values.slice().sort());
    }, want);
    assert.deepEqual((await names()).sort(), [...want].sort());
  }
  const first = await page.goto(origin + '/play');
  assert.equal(first.status(), 200);
  await waitForNames(initialNames);
  assert.deepEqual(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key), expected,
    'Loading the new deployment must preserve existing character IDs and values');
  await page.getByRole('button', { name: 'Roll Character', exact: true }).click();
  await page.waitForFunction(values => values.some(n => document.querySelector('h3')?.textContent === `You are: ${n}`), initialNames);
  await page.getByRole('button', { name: 'Add New Character', exact: true }).click();
  await page.getByPlaceholder('Enter character name').last().fill('Migration Added Character');
  await page.waitForFunction(k => Object.values(JSON.parse(localStorage.getItem(k)).characters).includes('Migration Added Character'), key);
  await page.reload();
  await waitForNames([...initialNames, 'Migration Added Character']);
  await page.getByRole('link', { name: 'Go Back', exact: true }).click();
  await page.getByRole('link', { name: 'Import Legacy Characters', exact: true }).click();
  await page.getByRole('textbox').fill('Migration Imported One\nMigration Imported Two');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Import Characters', exact: true }).click();
  await page.getByRole('link', { name: 'Go Back', exact: true }).click();
  await page.getByRole('link', { name: 'Quick Play (Offline)', exact: true }).click();
  await waitForNames(['Migration Imported One', 'Migration Imported Two']);
  await page.reload();
  await waitForNames(['Migration Imported One', 'Migration Imported Two']);
  for (const route of ['/', '/play', '/import']) {
    const response = await context.request.get(origin + route);
    assert.equal(response.status(), 200, 'Direct navigation must work: ' + route);
  }
  assert.equal((await context.request.get(origin + '/missing-migration-check')).status(), 404);
  for (const route of ['/play/', '/import/']) {
    const response = await context.request.get(origin + route + '?migration=1', { maxRedirects: 0 });
    assert.equal(response.status(), 308);
    assert.equal(new URL(response.headers().location, origin).href,
      origin + route.slice(0, -1) + '?migration=1');
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  assert.deepEqual(failedAssets, [], 'No missing Next.js assets');
  if (process.env.BAR_SAVE_STORAGE) await context.storageState({ path: process.env.BAR_SAVE_STORAGE });
  console.log(JSON.stringify({ origin, result: 'passed', existingCharacterIDsPreserved: true,
    addAndReload: true, legacyImport: true, navigationAndDeepLinks: true, browserErrors: errors.length }));
  await context.close();
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
