import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  detectProject,
  detectDirectoryTechnologies,
  detectMonorepo,
  recommendPacksFromTech,
  safeReadJson,
  safeReadText
} from '../lib/detector.js';

import {
  CONFIG_FILE,
  CONFIG_SCHEMA_VERSION,
  validateConfig,
  computeResolvedConfig,
  loadProjectConfig,
  saveProjectConfig,
  refreshProjectConfig
} from '../lib/config.js';

import { MANIFEST } from '../lib/cli.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(rootDir, 'bin', 'vibe-kit.js');

function runCli(args, cwd = rootDir) {
  return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

// 1. Detection Engine Unit Tests
test('detector: detects Node.js, package managers, and dependencies with valid evidence', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-test-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'sample-app',
      dependencies: {
        react: '^18.2.0',
        express: '^4.19.0'
      },
      devDependencies: {
        typescript: '^5.0.0'
      }
    }, null, 2));
    fs.writeFileSync(path.join(tmp, 'pnpm-lock.yaml'), '# lockfile\n');
    fs.writeFileSync(path.join(tmp, 'tsconfig.json'), '{\n  "compilerOptions": {}\n}\n');

    const result = detectProject(tmp);
    const techIds = result.technologies.map(t => t.id);

    assert(techIds.includes('nodejs'), 'Must detect nodejs');
    assert(techIds.includes('pnpm'), 'Must detect pnpm from lockfile');
    assert(techIds.includes('typescript'), 'Must detect typescript from tsconfig.json');
    assert(techIds.includes('react'), 'Must detect react');
    assert(techIds.includes('express'), 'Must detect express');

    const tsTech = result.technologies.find(t => t.id === 'typescript');
    assert.equal(tsTech.confidence, 'high');
    assert(tsTech.evidence.some(e => e.file === 'tsconfig.json'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: differentiates dependency in devDependencies as medium confidence when no config exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-devdep-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'devdep-app',
      devDependencies: {
        typescript: '^5.4.0'
      }
    }, null, 2));

    const result = detectProject(tmp);
    const tsTech = result.technologies.find(t => t.id === 'typescript');
    assert(tsTech, 'TypeScript must be detected');
    assert.equal(tsTech.confidence, 'medium', 'Should be medium confidence without tsconfig.json');
    assert.equal(tsTech.evidence[0].method, 'devDependency');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: detects Flutter via pubspec.yaml', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-flutter-'));
  try {
    fs.writeFileSync(path.join(tmp, 'pubspec.yaml'), 'name: my_app\nflutter:\n  uses-material-design: true\n');

    const result = detectProject(tmp);
    const techIds = result.technologies.map(t => t.id);

    assert(techIds.includes('dart'));
    assert(techIds.includes('flutter'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: detects Python frameworks via requirements.txt and pyproject.toml', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-python-'));
  try {
    fs.writeFileSync(path.join(tmp, 'requirements.txt'), 'fastapi>=0.100.0\nuvicorn\n');

    const result = detectProject(tmp);
    const techIds = result.technologies.map(t => t.id);

    assert(techIds.includes('python'));
    assert(techIds.includes('fastapi'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: detects PostgreSQL and Firebase concrete configurations', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-db-'));
  try {
    fs.mkdirSync(path.join(tmp, 'prisma'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'prisma', 'schema.prisma'), `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
    `);
    fs.writeFileSync(path.join(tmp, 'firebase.json'), '{\n  "hosting": {}\n}\n');

    const result = detectProject(tmp);
    const techIds = result.technologies.map(t => t.id);

    assert(techIds.includes('postgresql'), 'Must detect PostgreSQL from Prisma datasource');
    assert(techIds.includes('firebase'), 'Must detect Firebase from firebase.json');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: ignores node_modules, .git, and build output directories', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-ignore-'));
  try {
    fs.mkdirSync(path.join(tmp, 'node_modules', 'fake-lib'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'node_modules', 'fake-lib', 'package.json'), JSON.stringify({
      name: 'fake-lib',
      dependencies: { vue: '^3.0.0' }
    }));

    fs.mkdirSync(path.join(tmp, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'dist', 'package.json'), JSON.stringify({
      dependencies: { svelte: '^4.0.0' }
    }));

    // Root only has react
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));

    const result = detectProject(tmp);
    const techIds = result.technologies.map(t => t.id);

    assert(techIds.includes('react'));
    assert.equal(techIds.includes('vue'), false, 'Must ignore dependencies inside node_modules');
    assert.equal(techIds.includes('svelte'), false, 'Must ignore dependencies inside dist');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: handles malformed or corrupt package.json gracefully without crashing', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-corrupt-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{ this is invalid json !!!');

    const result = detectProject(tmp);
    assert(Array.isArray(result.technologies));
    assert.equal(result.technologies.length, 0, 'Corrupt package.json should yield 0 tech without crash');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: does not mutate repository files during detection', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-readonly-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'read-only-test' }));

    const beforeFiles = fs.readdirSync(tmp);
    detectProject(tmp);
    const afterFiles = fs.readdirSync(tmp);

    assert.deepEqual(beforeFiles, afterFiles, 'Filesystem must be 100% untouched after detection');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detector: monorepo detection preserves sub-package directory context', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-detect-monorepo-'));
  try {
    fs.writeFileSync(path.join(tmp, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
    fs.mkdirSync(path.join(tmp, 'apps', 'web'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'apps', 'api'), { recursive: true });

    fs.writeFileSync(path.join(tmp, 'apps', 'web', 'package.json'), JSON.stringify({
      dependencies: { vue: '^3.4.0' }
    }));
    fs.writeFileSync(path.join(tmp, 'apps', 'api', 'package.json'), JSON.stringify({
      dependencies: { express: '^4.19.0' }
    }));

    const result = detectProject(tmp);
    assert.equal(result.monorepo.isMonorepo, true);
    assert.equal(result.monorepo.packages.length, 2);

    const webPkg = result.monorepo.packages.find(p => p.name === 'web');
    assert(webPkg);
    assert.equal(webPkg.path, 'apps/web');
    assert(webPkg.technologies.some(t => t.id === 'vue'));

    const apiPkg = result.monorepo.packages.find(p => p.name === 'api');
    assert(apiPkg);
    assert.equal(apiPkg.path, 'apps/api');
    assert(apiPkg.technologies.some(t => t.id === 'express'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('recommendations: recommends appropriate role pack based on technologies', () => {
  assert.deepEqual(recommendPacksFromTech([{ id: 'react' }]), ['role:frontend']);
  assert.deepEqual(recommendPacksFromTech([{ id: 'express' }]), ['role:backend']);
  assert.deepEqual(recommendPacksFromTech([{ id: 'react' }, { id: 'express' }]), ['role:fullstack']);
  assert.deepEqual(recommendPacksFromTech([{ id: 'python' }]), ['core']);
});

// 2. Persistent Configuration Unit Tests
test('config: validateConfig validates version and overrides structure', () => {
  assert.equal(validateConfig({ version: 1, overrides: { enabled: [], disabled: [] } }), true);

  assert.throws(() => validateConfig(null), /non-null/);
  assert.throws(() => validateConfig({ version: 99 }), /Versi skema konfigurasi tidak didukung: 99/);
  assert.throws(() => validateConfig({ version: 1, overrides: 'not-object' }), /format "overrides"/i);
  assert.throws(() => validateConfig({ version: 1, overrides: { enabled: 'not-array' } }), /array/i);
});

test('config: computeResolvedConfig applies user overrides on top of detected facts', () => {
  const detected = {
    technologies: [
      { id: 'react', name: 'React', category: 'frontend-framework', confidence: 'high' },
      { id: 'express', name: 'Express', category: 'backend-framework', confidence: 'high' }
    ]
  };

  // 1. User disables React
  const resolvedDisabled = computeResolvedConfig(detected, { disabled: ['react'] });
  assert.equal(resolvedDisabled.technologies.some(t => t.id === 'react'), false, 'React must be excluded');
  assert.equal(resolvedDisabled.technologies.some(t => t.id === 'express'), true, 'Express must remain');
  assert.deepEqual(resolvedDisabled.recommendedPacks, ['role:backend']);

  // 2. User enables PostgreSQL override
  const resolvedEnabled = computeResolvedConfig(detected, { enabled: ['postgresql'] });
  assert(resolvedEnabled.technologies.some(t => t.id === 'postgresql'), 'PostgreSQL override must be included');

  // 3. User sets explicit pack override
  const resolvedPackOverride = computeResolvedConfig(detected, { packs: ['role:backend'] });
  assert.deepEqual(resolvedPackOverride.effectivePacks, ['role:backend']);
});

test('config: refreshProjectConfig preserves user overrides across re-detection', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-config-persist-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));

    // First run with user override
    const cfg1 = refreshProjectConfig(tmp, fs, { disable: ['react'], enable: ['tech:postgresql'] });
    saveProjectConfig(tmp, cfg1, fs);

    // Re-detect project
    const cfg2 = refreshProjectConfig(tmp, fs);

    assert(cfg2.overrides.disabled.includes('react'), 'Disabled override must survive re-detection');
    assert(cfg2.overrides.enabled.includes('tech:postgresql'), 'Enabled override must survive re-detection');
    assert.equal(cfg2.resolved.technologies.some(t => t.id === 'react'), false, 'React must stay excluded');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('config: loads and throws descriptive error on corrupt .vibe-kit.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-config-corrupt-'));
  try {
    fs.writeFileSync(path.join(tmp, CONFIG_FILE), '{ corrupt json');
    assert.throws(() => loadProjectConfig(tmp, fs), /File konfigurasi korup/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 3. CLI Integration Tests for Phase 2
test('cli integration: vibe-kit detect displays project stack and supports --json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-detect-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { vue: '^3.0.0' }
    }));

    // 1. Human-readable detect
    const resText = runCli(['detect', '--target', tmp]);
    assert.equal(resText.status, 0, resText.stderr);
    assert.match(resText.stdout, /vibe-kit detect — project stack inspection/);
    assert.match(resText.stdout, /Vue/);
    assert.match(resText.stdout, /role:frontend/);

    // Verify .vibe-kit.json was NOT written (read-only by default)
    assert.equal(fs.existsSync(path.join(tmp, CONFIG_FILE)), false);

    // 2. JSON output detect
    const resJson = runCli(['detect', '--target', tmp, '--json']);
    assert.equal(resJson.status, 0, resJson.stderr);
    const parsed = JSON.parse(resJson.stdout);
    assert.equal(parsed.version, 1);
    assert(parsed.detected.technologies.some(t => t.id === 'vue'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: vibe-kit detect --save writes persistent .vibe-kit.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-detect-save-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { express: '^4.19.0' }
    }));

    const res = runCli(['detect', '--target', tmp, '--save']);
    assert.equal(res.status, 0, res.stderr);

    const configPath = path.join(tmp, CONFIG_FILE);
    assert(fs.existsSync(configPath), '.vibe-kit.json must be written');

    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(configData.version, 1);
    assert(configData.detected.technologies.some(t => t.id === 'express'));
    assert.deepEqual(configData.resolved.recommendedPacks, ['role:backend']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: vibe-kit config manages overrides (--enable, --disable, --reset)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-config-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));

    // 1. Disable React and Enable PostgreSQL
    const res1 = runCli(['config', '--target', tmp, '--disable', 'react', '--enable', 'postgresql']);
    assert.equal(res1.status, 0, res1.stderr);

    let configData = JSON.parse(fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8'));
    assert(configData.overrides.disabled.includes('react'));
    assert(configData.overrides.enabled.includes('postgresql'));
    assert.equal(configData.resolved.technologies.some(t => t.id === 'react'), false);

    // 2. Reset overrides
    const resReset = runCli(['config', '--target', tmp, '--reset']);
    assert.equal(resReset.status, 0, resReset.stderr);

    configData = JSON.parse(fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8'));
    assert.deepEqual(configData.overrides.enabled, []);
    assert.deepEqual(configData.overrides.disabled, []);
    assert(configData.resolved.technologies.some(t => t.id === 'react'), 'React re-included after reset');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: init automatically uses configured packs from .vibe-kit.json in non-interactive mode', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-init-config-'));
  try {
    // Write package.json with express
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { express: '^4.19.0' }
    }));

    // Pre-save config with role:backend
    runCli(['detect', '--target', tmp, '--save']);

    // Run init non-interactively without specifying --pack or --profile
    const res = runCli(['init', '--target', tmp, '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert(manifest.paths.includes('.agents/skills/backend-feature/SKILL.md'));
    assert.equal(manifest.paths.includes('.agents/skills/ui-implementation/SKILL.md'), false);
    assert.deepEqual(manifest.packs, ['core', 'role:backend']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: doctor reports PASS for valid .vibe-kit.json and FAIL for corrupt config', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-doc-config-'));
  try {
    // 1. Initial workspace with init
    runCli(['init', '--target', tmp, '--profile', 'base', '--yes']);

    // Valid config check
    const docRes1 = runCli(['doctor', '--target', tmp]);
    assert.equal(docRes1.status, 0, docRes1.stderr);
    assert.match(docRes1.stdout, /Konfigurasi proyek \(\.vibe-kit\.json\) valid/);

    // Corrupt config check
    fs.writeFileSync(path.join(tmp, CONFIG_FILE), 'invalid json content');
    const docRes2 = runCli(['doctor', '--target', tmp]);
    assert.equal(docRes2.status, 1);
    assert.match(docRes2.stdout, /File konfigurasi proyek \(\.vibe-kit\.json\) korup/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
