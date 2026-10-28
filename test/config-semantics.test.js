import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  CONFIG_FILE,
  validateConfig,
  computeResolvedConfig,
  loadProjectConfig,
  saveProjectConfig,
  refreshProjectConfig
} from '../lib/config.js';
import {
  detectProject,
  recommendPacksFromTech
} from '../lib/detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(ROOT, 'bin', 'vibe-kit.js');
const MANIFEST = '.vibe-kit-manifest.json';

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

test('role selection: empty repo recommends core only, does not assume fullstack', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-empty-'));
  try {
    const detected = detectProject(tmp);
    assert.deepEqual(detected.technologies, []);
    const recommended = recommendPacksFromTech(detected.technologies);
    assert.deepEqual(recommended, ['core']);

    const resolved = computeResolvedConfig(detected);
    assert.deepEqual(resolved.technologies, []);
    assert.deepEqual(resolved.recommendedPacks, ['core']);
    assert.deepEqual(resolved.effectivePacks, ['core']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('role selection: technology without dedicated pack (PostgreSQL only) recommends core', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-pg-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { pg: '^8.11.0' }
    }));

    const detected = detectProject(tmp);
    assert(detected.technologies.some(t => t.id === 'postgresql'));
    const recommended = recommendPacksFromTech(detected.technologies);
    assert.deepEqual(recommended, ['core']);

    const resolved = computeResolvedConfig(detected);
    assert.deepEqual(resolved.recommendedPacks, ['core']);
    assert.deepEqual(resolved.effectivePacks, ['core']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('role selection: multiple role candidates (React + Express) recommends role:fullstack', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-full-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0', express: '^4.19.0' }
    }));

    const detected = detectProject(tmp);
    const recommended = recommendPacksFromTech(detected.technologies);
    assert.deepEqual(recommended, ['role:fullstack']);

    const resolved = computeResolvedConfig(detected);
    assert.deepEqual(resolved.recommendedPacks, ['role:fullstack']);
    assert.deepEqual(resolved.effectivePacks, ['role:fullstack']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('role selection: monorepo maintains application context and allows targeted detection', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-mono-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'mono-root',
      workspaces: ['apps/*']
    }));

    const appsDir = path.join(tmp, 'apps');
    const webDir = path.join(appsDir, 'web');
    const apiDir = path.join(appsDir, 'api');
    fs.mkdirSync(webDir, { recursive: true });
    fs.mkdirSync(apiDir, { recursive: true });

    fs.writeFileSync(path.join(webDir, 'package.json'), JSON.stringify({
      name: 'web-client',
      dependencies: { vue: '^3.0.0' }
    }));
    fs.writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({
      name: 'api-server',
      dependencies: { fastify: '^4.0.0' }
    }));

    // Root detection retains package context
    const rootDetected = detectProject(tmp);
    assert.equal(rootDetected.monorepo.isMonorepo, true);
    assert.equal(rootDetected.monorepo.packages.length, 2);

    const webPkg = rootDetected.monorepo.packages.find(p => p.name === 'web');
    assert(webPkg.technologies.some(t => t.id === 'vue'));
    assert.equal(webPkg.technologies.some(t => t.id === 'fastify'), false);

    const apiPkg = rootDetected.monorepo.packages.find(p => p.name === 'api');
    assert(apiPkg.technologies.some(t => t.id === 'fastify'));
    assert.equal(apiPkg.technologies.some(t => t.id === 'vue'), false);

    // Targeted sub-app detection recommends targeted roles
    const webOnly = detectProject(webDir);
    assert.deepEqual(recommendPacksFromTech(webOnly.technologies), ['role:frontend']);

    const apiOnly = detectProject(apiDir);
    assert.deepEqual(recommendPacksFromTech(apiOnly.technologies), ['role:backend']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('default rules: configured empty repo uses effectivePacks core, unconfigured uses legacy fallback', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-defaults-'));
  try {
    // 1. Unconfigured empty repo in non-interactive mode: uses legacy fallback 'fullstack'
    const unconfRes = runCli(['init', '--target', tmp, '--yes']);
    assert.equal(unconfRes.status, 0, unconfRes.stderr);
    assert.match(unconfRes.stdout, /Menggunakan fallback kompatibilitas CLI legacy: profil "fullstack"/);
    const unconfManifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(unconfManifest.packs, ['core', 'role:frontend', 'role:backend', 'role:fullstack']);

    // Clean up
    fs.rmSync(path.join(tmp, MANIFEST));
    fs.rmSync(path.join(tmp, CONFIG_FILE));
    fs.rmSync(path.join(tmp, '.agents'), { recursive: true, force: true });

    // 2. Configured empty repo with detect --save: effectivePacks is core
    runCli(['detect', '--target', tmp, '--save']);
    const confRes = runCli(['init', '--target', tmp, '--yes']);
    assert.equal(confRes.status, 0, confRes.stderr);
    assert.doesNotMatch(confRes.stdout, /fallback kompatibilitas CLI legacy/);
    const confManifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(confManifest.packs, ['core']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('overrides: technology detected and enabled maintains source detected', () => {
  const detected = {
    technologies: [{ id: 'react', name: 'React', category: 'frontend-framework', confidence: 'high' }]
  };
  const resolved = computeResolvedConfig(detected, { enabled: ['react'] });
  const react = resolved.technologies.find(t => t.id === 'react');
  assert.ok(react);
  assert.equal(react.source, 'detected');
});

test('overrides: technology not detected but enabled adds with user-override source and changes recommendation', () => {
  const detected = { technologies: [] };
  const resolved = computeResolvedConfig(detected, { enabled: ['vue'] });
  const vue = resolved.technologies.find(t => t.id === 'vue');
  assert.ok(vue);
  assert.equal(vue.source, 'user-override');
  assert.deepEqual(resolved.recommendedPacks, ['role:frontend']);
  assert.deepEqual(resolved.effectivePacks, ['role:frontend']);
});

test('overrides: technology detected but disabled excludes tech and adjusts recommendation', () => {
  const detected = {
    technologies: [
      { id: 'react', name: 'React', category: 'frontend-framework', confidence: 'high' },
      { id: 'express', name: 'Express', category: 'backend-framework', confidence: 'high' }
    ]
  };
  // Disabling React should reduce fullstack down to role:backend
  const resolved = computeResolvedConfig(detected, { disabled: ['react'] });
  assert.equal(resolved.technologies.some(t => t.id === 'react'), false);
  assert(resolved.technologies.some(t => t.id === 'express'));
  assert.deepEqual(resolved.recommendedPacks, ['role:backend']);
  assert.deepEqual(resolved.effectivePacks, ['role:backend']);
});

test('overrides: conflicting enable and disable triggers validation error and enforces safety invariant', () => {
  // 1. validateConfig rejects conflicting technology in enabled and disabled
  assert.throws(() => {
    validateConfig({
      version: 1,
      overrides: {
        enabled: ['react'],
        disabled: ['react']
      }
    });
  }, /Konflik override pada konfigurasi/);

  // 2. computeResolvedConfig enforces disabled over enabled as safety invariant
  const detected = {
    technologies: [{ id: 'react', name: 'React', category: 'frontend-framework', confidence: 'high' }]
  };
  const resolved = computeResolvedConfig(detected, {
    enabled: ['react'],
    disabled: ['react']
  });
  assert.equal(resolved.technologies.some(t => t.id === 'react'), false);
  assert.deepEqual(resolved.effectivePacks, ['core']);
});

test('overrides: explicit pack in overrides.packs overrides recommendation even without supporting tech', () => {
  const detected = { technologies: [] };
  const resolved = computeResolvedConfig(detected, { packs: ['role:frontend'] });
  assert.deepEqual(resolved.recommendedPacks, ['core']);
  assert.deepEqual(resolved.effectivePacks, ['role:frontend']);
});

test('overrides: validateConfig rejects malformed or invalid pack IDs in overrides.packs', () => {
  assert.throws(() => {
    validateConfig({
      version: 1,
      overrides: { packs: 'role:frontend' } // not an array
    });
  }, /"overrides\.packs" harus berupa array string/);

  assert.throws(() => {
    validateConfig({
      version: 1,
      overrides: { packs: ['INVALID PACK ID!!'] } // invalid pack id format
    });
  }, /"overrides\.packs" harus berupa array string ID pack yang valid/);
});

test('source of truth: init invocation flag does not pollute persistent overrides.packs in .vibe-kit.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-sot-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));

    // Pre-save config (overrides.packs is empty)
    runCli(['detect', '--target', tmp, '--save']);

    // Install using invocation flag --pack role:backend
    const initRes = runCli(['init', '--target', tmp, '--pack', 'role:backend', '--yes']);
    assert.equal(initRes.status, 0, initRes.stderr);

    // Manifest stores what was actually installed
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:backend']);

    // Configuration file must NOT have overrides.packs set to ['core', 'role:backend']
    const configData = JSON.parse(fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8'));
    assert.deepEqual(configData.overrides.packs, [], 'CLI invocation flag must not silently become persistent override');
    assert.deepEqual(configData.resolved.recommendedPacks, ['role:frontend'], 'Recommendations remain intact based on repo facts');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('source of truth: update respects manifest.packs as source of truth and does not overwrite user overrides', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-up-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));

    // 1. Initial install with role:frontend
    runCli(['init', '--target', tmp, '--profile', 'frontend', '--yes']);

    // 2. Set an explicit tech override in config
    runCli(['config', '--target', tmp, '--enable', 'postgresql']);
    let configData = JSON.parse(fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8'));
    assert(configData.overrides.enabled.includes('postgresql'));

    // 3. Run update
    const updateRes = runCli(['update', '--target', tmp, '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);

    // Manifest packs remain what was installed
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:frontend']);

    // User override in config remains intact
    configData = JSON.parse(fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8'));
    assert(configData.overrides.enabled.includes('postgresql'), 'User override must not be overwritten by update');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('safety: saveProjectConfig writes atomically and validates containment', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-save-'));
  try {
    const configData = {
      version: 1,
      overrides: { enabled: [], disabled: [], packs: [] }
    };

    // Valid save
    const savedPath = saveProjectConfig(tmp, configData);
    assert(fs.existsSync(savedPath));

    // Traversal or escaping path is rejected
    assert.throws(() => {
      saveProjectConfig(path.join(tmp, '..', 'escaped'), configData);
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('safety: detect --dry-run and config --dry-run perform zero filesystem writes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-dry-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { svelte: '^4.0.0' }
    }));

    // 1. detect --dry-run --save
    const detRes = runCli(['detect', '--target', tmp, '--save', '--dry-run']);
    assert.equal(detRes.status, 0, detRes.stderr);
    assert.equal(fs.existsSync(path.join(tmp, CONFIG_FILE)), false, '.vibe-kit.json must not be created on dry-run');

    // 2. config --dry-run
    const confRes = runCli(['config', '--target', tmp, '--enable', 'django', '--dry-run']);
    assert.equal(confRes.status, 0, confRes.stderr);
    assert.equal(fs.existsSync(path.join(tmp, CONFIG_FILE)), false, '.vibe-kit.json must not be created on dry-run');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('safety: corrupt .vibe-kit.json halts init with actionable error and is never silently overwritten', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-corrupt-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));
    fs.writeFileSync(path.join(tmp, CONFIG_FILE), '{ corrupted JSON content: ');

    const res = runCli(['init', '--target', tmp, '--yes']);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /File konfigurasi "\.vibe-kit\.json" korup atau tidak valid/);

    // Corrupt file was preserved and not overwritten
    const content = fs.readFileSync(path.join(tmp, CONFIG_FILE), 'utf8');
    assert.equal(content, '{ corrupted JSON content: ');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('doctor: reports FAIL when .vibe-kit.json contains unknown packs in effectivePacks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-sem-doc-'));
  try {
    runCli(['init', '--target', tmp, '--profile', 'base', '--yes']);

    // Set invalid pack in config overrides
    const configPath = path.join(tmp, CONFIG_FILE);
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    cfg.overrides.packs = ['role:nonexistent'];
    cfg.resolved.effectivePacks = ['role:nonexistent'];
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));

    const docRes = runCli(['doctor', '--target', tmp]);
    assert.equal(docRes.status, 1);
    assert.match(docRes.stdout, /Pack dalam konfigurasi proyek \(\.vibe-kit\.json\) tidak valid/);
    assert.match(docRes.stdout, /Pack tidak dikenal/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
