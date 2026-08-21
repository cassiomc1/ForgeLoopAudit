import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { tmpdir } from 'node:os';

const LAUNCH_TIMEOUT_MS = Number(process.env.FORGELOOP_SMOKE_LAUNCH_TIMEOUT_MS || 45_000);
const WINDOW_TIMEOUT_MS = Number(process.env.FORGELOOP_SMOKE_WINDOW_TIMEOUT_MS || 45_000);
const output = join(process.cwd(), 'dist-electron');
const candidates = [];
if (process.platform === 'darwin') {
  for (const entry of readdirSync(output, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('mac-')) candidates.push(join(output, entry.name, 'ForgeLoop Studio.app', 'Contents', 'MacOS', 'ForgeLoop Studio'));
  }
} else if (process.platform === 'win32') {
  candidates.push(join(output, 'win-unpacked', 'ForgeLoop Studio.exe'));
} else {
  candidates.push(join(output, 'linux-unpacked', 'forgeloop-studio'));
}
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error(`Packaged Electron executable not found. Checked: ${candidates.join(', ')}`);

const startedAt = performance.now();
const smokeFile = join(tmpdir(), `forgeloop-studio-smoke-${process.pid}.json`);
let child;
let stdout = '';
let stderr = '';
try {
  console.log(`Packaged smoke executable=${executablePath}`);
  child = spawn(executablePath, [], { env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1', FORGELOOP_STUDIO_SMOKE_FILE: smokeFile }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => { stdout = `${stdout}${chunk}`.slice(-20_000); });
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-20_000); });
  await waitForSpawn(child, LAUNCH_TIMEOUT_MS);
  console.log(`Packaged smoke launched elapsedMs=${Math.round(performance.now() - startedAt)} pid=${child.pid}`);
  await waitForFile(smokeFile, WINDOW_TIMEOUT_MS, child);
  const result = JSON.parse(readFileSync(smokeFile, 'utf8'));
  const title = result.title;
  const bridgeType = result.bridgeType;
  if (title !== 'ForgeLoop Studio') throw new Error(`Unexpected packaged window title: ${title}`);
  if (bridgeType !== 'object') throw new Error(`Preload bridge unavailable: ${bridgeType}`);
  console.log(`Packaged smoke passed elapsedMs=${Math.round(performance.now() - startedAt)} title=${title} bridge=${bridgeType}`);
} catch (error) {
  console.error(`Packaged smoke failed elapsedMs=${Math.round(performance.now() - startedAt)} pid=${child?.pid ?? 'unknown'} exitCode=${child?.exitCode ?? 'unknown'} signal=${child?.signalCode ?? 'unknown'}`);
  console.error(error instanceof Error ? error.stack : String(error));
  console.error(`stdout:\n${stdout}`);
  console.error(`stderr:\n${stderr}`);
  throw error;
} finally {
  if (child && !child.killed) child.kill('SIGTERM');
  rmSync(smokeFile, { force: true });
}

async function waitForFile(path, timeoutMs, process) {
  const started = performance.now();
  while (!existsSync(path)) {
    if (process.exitCode !== null) throw new Error(`Packaged process exited before readiness marker: ${process.exitCode}`);
    if (performance.now() - started > timeoutMs) throw new Error(`Readiness marker timed out after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function waitForSpawn(process, timeoutMs) {
  if (process.pid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Electron spawn timed out after ${timeoutMs}ms`)), timeoutMs);
    process.once('spawn', () => { clearTimeout(timer); resolve(); });
    process.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
}
