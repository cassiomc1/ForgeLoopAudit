import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const output = join(process.cwd(), 'dist-electron');
const candidates = [];
if (process.platform === 'darwin') {
  for (const entry of readdirSync(output, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('mac-')) candidates.push(join(output, entry.name, 'ForgeLoopAudit.app', 'Contents', 'MacOS', 'ForgeLoopAudit'));
  }
} else if (process.platform === 'win32') {
  candidates.push(join(output, 'win-unpacked', 'ForgeLoopAudit.exe'));
} else {
  candidates.push(join(output, 'linux-unpacked', 'forgeloop-audit'));
}
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error(`Packaged Electron executable not found. Checked: ${candidates.join(', ')}`);

const resourcesDir = process.platform === 'darwin'
  ? join(executablePath, '..', '..', 'Resources')
  : join(executablePath, '..', 'resources');
if (!existsSync(join(resourcesDir, 'demo', '.forgeloop', 'config.json'))) {
  throw new Error(`Bundled demo project missing from packaged resources: ${join(resourcesDir, 'demo')}`);
}

const packageVersion = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).version;

// The packaged binary has RunAsNode/inspect fuses disabled, so Playwright's
// Electron launcher cannot attach; drive the real app through its Chromium
// remote-debugging port instead.
const cdpPort = await findFreePort();
const args = [...(process.platform === 'linux' ? ['--no-sandbox'] : []), `--remote-debugging-port=${cdpPort}`];
const startedAt = Date.now();
let stdout = '';
let stderr = '';
let exitCode = null;
const child = spawn(executablePath, args, {
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (chunk) => { stdout = `${stdout}${chunk}`.slice(-20_000); });
child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-20_000); });
child.on('exit', (code) => { exitCode = code; });

try {
  const endpoint = await waitForCdpEndpoint(cdpPort, 60_000);
  console.log(`Packaged app reachable over CDP at ${endpoint} (${Date.now() - startedAt}ms)`);

  const browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    page = context.pages().find((candidate) => !candidate.url().startsWith('devtools')) ?? context.pages()[0];
    if (!page) await sleep(200);
  }
  if (!page) throw new Error('No window page found in the packaged app');

  await waitForText(page, 'ForgeLoopAudit', 'Project Picker heading');
  const openDemo = page.getByRole('button', { name: 'Open Demo Project' });
  await expectVisible(openDemo, 'Open Demo Project button');
  await openDemo.click();
  console.log('Clicked Open Demo Project');

  await waitForHeading(page, 'Audit Summary', 'Audit Summary heading');
  const runAudit = page.getByRole('button', { name: /Run audit|Retry audit/ });
  if ((await runAudit.count()) > 0) await runAudit.first().click();
  await waitForTextMatch(page, 'Audit coverage|Score unavailable', 'audit result summary');

  await page.getByRole('button', { name: 'Tasks', exact: true }).click();
  for (const taskId of ['TASK-001', 'TASK-004']) {
    await expectVisible(page.getByText(taskId), taskId);
  }

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await waitForText(page, `ForgeLoopAudit v${packageVersion}`, 'runtime version in Settings About');

  await page.getByRole('button', { name: 'Policy & Trust', exact: true }).click();
  await waitForHeading(page, 'Policy & Trust', 'Policy & Trust page');

  console.log(`Packaged Open Demo smoke passed (opened bundled demo, runtime version v${packageVersion})`);
} catch (error) {
  console.error(`Packaged Open Demo smoke failed pid=${child.pid} exitCode=${exitCode ?? child.exitCode ?? 'running'}`);
  console.error(error instanceof Error ? error.stack : String(error));
  console.error(`stdout:\n${stdout}`);
  console.error(`stderr:\n${stderr}`);
  throw error;
} finally {
  if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitForCdpEndpoint(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (exitCode !== null) throw new Error(`Packaged process exited before CDP readiness: ${exitCode}\nstderr:\n${stderr}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        const info = await response.json();
        return info.webSocketDebuggerUrl ?? `http://127.0.0.1:${port}`;
      }
    } catch {
      // Not ready yet.
    }
    await sleep(250);
  }
  throw new Error(`Chromium remote debugging endpoint did not open within ${timeoutMs}ms`);
}

async function expectVisible(locator, label, timeoutMs = 30_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch (error) {
    throw new Error(`Expected ${label} to be visible in the packaged app: ${error.message}`);
  }
}

async function waitForText(page, text, label, timeoutMs = 30_000) {
  try {
    await page.waitForFunction(
      (needle) => document.body?.innerText?.includes(needle),
      text,
      { timeout: timeoutMs },
    );
  } catch (error) {
    throw new Error(`Expected ${label} ("${text}") in the packaged app UI: ${error.message}`);
  }
}

async function waitForTextMatch(page, pattern, label, timeoutMs = 30_000) {
  try {
    await page.waitForFunction(
      (source) => new RegExp(source).test(document.body?.innerText ?? ''),
      pattern,
      { timeout: timeoutMs },
    );
  } catch (error) {
    throw new Error(`Expected ${label} (/${pattern}/) in the packaged app UI: ${error.message}`);
  }
}

async function waitForHeading(page, text, label, timeoutMs = 30_000) {
  try {
    await page.waitForFunction(
      (needle) => [...document.querySelectorAll('h1')].some((heading) => heading.innerText.includes(needle)),
      text,
      { timeout: timeoutMs },
    );
  } catch (error) {
    throw new Error(`Expected heading for ${label} ("${text}") in the packaged app UI: ${error.message}`);
  }
}
