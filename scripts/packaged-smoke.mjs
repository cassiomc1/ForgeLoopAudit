import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { _electron as electron } from 'playwright';

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

const app = await electron.launch({ executablePath, env: { ...process.env, NODE_ENV: 'production', FORGELOOP_STUDIO_SMOKE: '1' } });
try {
  const window = await app.firstWindow();
  const title = await window.title();
  if (title !== 'ForgeLoop Studio') throw new Error(`Unexpected packaged window title: ${title}`);
  const bridgeType = await window.evaluate(() => typeof window.forgeLoopStudio);
  if (bridgeType !== 'object') throw new Error(`Preload bridge unavailable: ${bridgeType}`);
} finally {
  await app.close();
}
