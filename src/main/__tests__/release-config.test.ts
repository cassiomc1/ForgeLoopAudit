import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = readFileSync('electron-builder.release.yml', 'utf8');

describe('release builder contract', () => {
  it('declares the complete unsigned preview matrix and branded assets', () => {
    expect(config).toContain('forceCodeSigning: false');
    expect(config).toContain('icon: build/icon.icns');
    expect(config).toContain('icon: build/icon.ico');
    expect(config).toContain('icon: build/icon.png');
    expect(config).toMatch(/target:\s*\n\s*- target: dmg[\s\S]*?arch:\s*\n\s*- arm64\s*\n\s*- x64/);
    expect(config).toMatch(/- target: zip[\s\S]*?arch:\s*\n\s*- arm64\s*\n\s*- x64/);
    expect(config).toMatch(/win:\s*[\s\S]*?target:\s*\n\s*- nsis\s*\n\s*- portable/);
    expect(config).toMatch(/linux:\s*[\s\S]*?target:\s*\n\s*- AppImage/);
  });
});
