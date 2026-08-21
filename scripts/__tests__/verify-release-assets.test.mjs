import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const script = join(process.cwd(), 'scripts', 'verify-release-assets.mjs');
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const version = pkg.version;
const headCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
const provenanceCommit = '19355e701e191d830c56d64e535835e925843bae';

const DISTRIBUTABLES = {
  macos: [
    `ForgeLoop.Studio-${version}-arm64.dmg`,
    `ForgeLoop.Studio-${version}-x64.dmg`,
    `ForgeLoop.Studio-${version}-arm64.zip`,
    `ForgeLoop.Studio-${version}-x64.zip`,
  ],
  windows: [
    `ForgeLoop.Studio.Setup.${version}.exe`,
    `ForgeLoop.Studio.${version}.exe`,
  ],
  linux: [
    `ForgeLoop.Studio-${version}.AppImage`,
  ],
};

const content = (name) => `public-bytes:${name}`;

function architectureFor(platform, name) {
  if (platform !== 'macos') return 'x64';
  return name.toLowerCase().includes('arm64') ? 'arm64' : 'x64';
}

function evidenceFor(name, platform, { commit = headCommit, runId = 'local', ...overrides } = {}) {
  return {
    studioVersion: version,
    gitCommit: commit,
    forgeLoopCompatibility: { protocolVersion: 1, schemaProvenanceCommit: provenanceCommit },
    platform,
    architecture: architectureFor(platform, name),
    artifact: name,
    sha256: createHash('sha256').update(content(name)).digest('hex'),
    signing: 'unsigned-preview',
    workflowRunId: runId,
    ...overrides,
  };
}

function buildBundle(bundleOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), 'forgeloop-assemble-verify-'));
  const assets = join(root, 'release-assets');
  mkdirSync(assets, { recursive: true });
  for (const [platform, names] of Object.entries(DISTRIBUTABLES)) {
    const lines = [];
    for (const name of names) {
      writeFileSync(join(assets, name), content(name));
      lines.push(`${createHash('sha256').update(content(name)).digest('hex')}  ${name}`);
    }
    writeFileSync(join(assets, `SHA256SUMS-${platform}`), `${lines.join('\n')}\n`);
    for (const name of names) {
      writeFileSync(join(assets, `RELEASE-EVIDENCE-${name}.json`), `${JSON.stringify(evidenceFor(name, platform, bundleOptions.evidence), null, 2)}\n`);
    }
  }
  writeFileSync(join(assets, 'SBOM-cyclonedx.json'), `${JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    metadata: { component: { type: 'application', name: pkg.name, version } },
    components: [{ type: 'library', name: 'demo-dependency', version: '1.0.0' }],
  }, null, 2)}\n`);
  return { root, assets };
}

function runVerifier({ root, env = {} } = {}) {
  return execFileSync(process.execPath, [script, 'release-assets'], {
    cwd: root,
    env: { ...process.env, GITHUB_SHA: '', GITHUB_RUN_ID: '', ...env },
    encoding: 'utf8',
  });
}

function mutateEvidence(assets, name, mutate) {
  const path = join(assets, `RELEASE-EVIDENCE-${name}.json`);
  const item = JSON.parse(readFileSync(path, 'utf8'));
  mutate(item);
  writeFileSync(path, `${JSON.stringify(item, null, 2)}\n`);
}

function withBundle(run) {
  const bundle = buildBundle();
  try {
    run(bundle);
  } finally {
    rmSync(bundle.root, { recursive: true, force: true });
  }
}

test('accepts a complete flat bundle whose evidence, checksums, and SBOM all agree', () => {
  withBundle(({ root }) => {
    const output = runVerifier({ root });
    assert.match(output, /exact public asset set \(18 files\)/);
  });
});

test('binds evidence to GITHUB_SHA and GITHUB_RUN_ID when running under Actions', () => {
  const bundle = buildBundle({ evidence: { runId: '424242' } });
  try {
    const output = runVerifier({ root: bundle.root, env: { GITHUB_SHA: headCommit, GITHUB_RUN_ID: '424242' } });
    assert.match(output, /semantic evidence bound to commit/);
  } finally {
    rmSync(bundle.root, { recursive: true, force: true });
  }
});

test('rejects evidence whose gitCommit differs from the CI build commit', () => {
  withBundle(({ root }) => {
    assert.throws(() => runVerifier({ root, env: { GITHUB_SHA: 'f'.repeat(40) } }), /gitCommit does not match build commit/);
  });
});

test('rejects evidence whose workflowRunId differs from the CI run id', () => {
  withBundle(({ root }) => {
    assert.throws(() => runVerifier({ root, env: { GITHUB_RUN_ID: '999' } }), /workflowRunId local does not match run 999/);
  });
});

test('rejects evidence bound to the wrong artifact filename', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.macos[0], (item) => { item.artifact = 'other.dmg'; });
    assert.throws(() => runVerifier({ root }), /evidence artifact other\.dmg does not match/);
  });
});

test('rejects evidence whose sha256 disagrees with the actual artifact bytes', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.linux[0], (item) => { item.sha256 = 'a'.repeat(64); });
    assert.throws(() => runVerifier({ root }), /sha256 does not match actual artifact bytes/);
  });
});

test('rejects evidence claiming the wrong platform', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.windows[0], (item) => { item.platform = 'macos'; });
    assert.throws(() => runVerifier({ root }), /evidence platform macos does not match windows/);
  });
});

test('rejects evidence claiming the wrong architecture', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.macos[0], (item) => { item.architecture = 'x64'; });
    assert.throws(() => runVerifier({ root }), /evidence architecture x64 does not match arm64/);
  });
});

test('rejects evidence carrying the wrong Studio version', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.macos[1], (item) => { item.studioVersion = '9.9.9'; });
    assert.throws(() => runVerifier({ root }), /studioVersion 9\.9\.9 does not match expected/);
  });
});

test('rejects evidence violating the unsigned-preview signing policy', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.macos[2], (item) => { item.signing = 'signed'; });
    assert.throws(() => runVerifier({ root }), /invalid release evidence schema[\s\S]*signing/);
  });
});

test('rejects evidence that fails the JSON Schema contract', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.macos[3], (item) => { delete item.forgeLoopCompatibility; });
    assert.throws(() => runVerifier({ root }), /invalid release evidence schema/);
  });
});

test('rejects evidence with unexpected additional properties', () => {
  withBundle(({ assets, root }) => {
    mutateEvidence(assets, DISTRIBUTABLES.windows[1], (item) => { item.extra = 'field'; });
    assert.throws(() => runVerifier({ root }), /invalid release evidence schema/);
  });
});

test('rejects evidence that is not valid JSON', () => {
  withBundle(({ assets, root }) => {
    writeFileSync(join(assets, `RELEASE-EVIDENCE-${DISTRIBUTABLES.linux[0]}.json`), '{not-json');
    assert.throws(() => runVerifier({ root }), /not valid JSON/);
  });
});

test('rejects a bundle with a missing evidence file', () => {
  withBundle(({ assets, root }) => {
    rmSync(join(assets, `RELEASE-EVIDENCE-${DISTRIBUTABLES.linux[0]}.json`));
    assert.throws(() => runVerifier({ root }), /missing evidence|does not have a matching distributable|no such file/i);
  });
});

test('rejects distributable bytes that no longer match the checksum manifest', () => {
  withBundle(({ assets, root }) => {
    writeFileSync(join(assets, DISTRIBUTABLES.macos[0]), 'tampered-bytes');
    assert.throws(() => runVerifier({ root }), /checksum mismatch/);
  });
});

test('rejects a checksum manifest that omits an actual distributable', () => {
  withBundle(({ assets, root }) => {
    const path = join(assets, 'SHA256SUMS-windows');
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    writeFileSync(path, `${lines.filter((line) => !line.includes('Setup')).join('\n')}\n`);
    assert.throws(() => runVerifier({ root }), /manifest does not exactly cover distributables/);
  });
});

test('rejects duplicate checksum entries and unsafe asset names', () => {
  withBundle(({ assets, root }) => {
    const digest = createHash('sha256').update(content(DISTRIBUTABLES.linux[0])).digest('hex');
    writeFileSync(join(assets, 'SHA256SUMS-linux'), `${digest}  ${DISTRIBUTABLES.linux[0]}\n${digest}  ${DISTRIBUTABLES.linux[0]}\n`);
    assert.throws(() => runVerifier({ root }), /duplicate checksum entry/);
  });
  withBundle(({ assets, root }) => {
    writeFileSync(join(assets, 'SHA256SUMS-linux'), `${'a'.repeat(64)}  ../escape.AppImage\n`);
    assert.throws(() => runVerifier({ root }), /unsafe checksum asset name/);
  });
});

test('rejects a bundle without the SBOM', () => {
  withBundle(({ assets, root }) => {
    rmSync(join(assets, 'SBOM-cyclonedx.json'));
    assert.throws(() => runVerifier({ root }), /Missing SBOM-cyclonedx\.json/);
  });
});

test('rejects a non-CycloneDX SBOM', () => {
  withBundle(({ assets, root }) => {
    const sbom = JSON.parse(readFileSync(join(assets, 'SBOM-cyclonedx.json'), 'utf8'));
    sbom.bomFormat = 'SPDX';
    writeFileSync(join(assets, 'SBOM-cyclonedx.json'), JSON.stringify(sbom));
    assert.throws(() => runVerifier({ root }), /bomFormat must be CycloneDX/);
  });
});

test('rejects an SBOM without components', () => {
  withBundle(({ assets, root }) => {
    const sbom = JSON.parse(readFileSync(join(assets, 'SBOM-cyclonedx.json'), 'utf8'));
    sbom.components = [];
    writeFileSync(join(assets, 'SBOM-cyclonedx.json'), JSON.stringify(sbom));
    assert.throws(() => runVerifier({ root }), /SBOM has no components/);
  });
});

test('rejects an SBOM whose application component does not match the released package', () => {
  withBundle(({ assets, root }) => {
    const sbom = JSON.parse(readFileSync(join(assets, 'SBOM-cyclonedx.json'), 'utf8'));
    sbom.metadata.component.name = 'other-app';
    writeFileSync(join(assets, 'SBOM-cyclonedx.json'), JSON.stringify(sbom));
    assert.throws(() => runVerifier({ root }), /SBOM component name/);
  });
  withBundle(({ assets, root }) => {
    const sbom = JSON.parse(readFileSync(join(assets, 'SBOM-cyclonedx.json'), 'utf8'));
    sbom.metadata.component.version = '9.9.9';
    writeFileSync(join(assets, 'SBOM-cyclonedx.json'), JSON.stringify(sbom));
    assert.throws(() => runVerifier({ root }), /SBOM component version/);
  });
});

test('rejects staging-only release metadata in the public bundle', () => {
  withBundle(({ assets, root }) => {
    writeFileSync(join(assets, 'RELEASE-METADATA-macos.json'), '{}\n');
    assert.throws(() => runVerifier({ root }), /unexpected: RELEASE-METADATA-macos\.json/);
  });
});

test('rejects any unexpected extra public asset', () => {
  withBundle(({ assets, root }) => {
    writeFileSync(join(assets, 'latest.yml'), 'internal\n');
    assert.throws(() => runVerifier({ root }), /unexpected: latest\.yml/);
  });
});

test('rejects unexpected directories inside the assembled bundle', () => {
  withBundle(({ assets, root }) => {
    mkdirSync(join(assets, 'macos'));
    assert.throws(() => runVerifier({ root }), /unexpected directories: macos/);
  });
});

test('rejects a bundle missing a platform checksum manifest', () => {
  withBundle(({ assets, root }) => {
    rmSync(join(assets, 'SHA256SUMS-linux'));
    assert.throws(() => runVerifier({ root }), /Missing SHA256SUMS-linux/);
  });
});
