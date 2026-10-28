import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePack, isValidPackId } from '../lib/pack-contract.js';
import { BUILTIN_PACKS, PACK_REGISTRY } from '../lib/packs.js';
import {
  resolvePacks,
  resolvePackFiles,
  previewResolution,
  mapLegacyProfileToPacks,
  LEGACY_PROFILE_MAP
} from '../lib/pack-resolver.js';
import { MANIFEST } from '../lib/cli.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(rootDir, 'bin', 'vibe-kit.js');

function runCli(args, cwd = rootDir) {
  return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

test('pack-contract: isValidPackId validates pack ID convention', () => {
  assert.equal(isValidPackId('core'), true);
  assert.equal(isValidPackId('role:frontend'), true);
  assert.equal(isValidPackId('engine:remotion'), true);
  assert.equal(isValidPackId('tech:postgresql'), true);
  assert.equal(isValidPackId('specialist:performance'), true);

  assert.equal(isValidPackId(''), false);
  assert.equal(isValidPackId('   '), false);
  assert.equal(isValidPackId('Upper:Case'), false);
  assert.equal(isValidPackId('role/frontend'), false);
  assert.equal(isValidPackId('role::frontend'), false);
  assert.equal(isValidPackId(':core'), false);
});

test('pack-contract: accepts valid pack definition', () => {
  const valid = {
    id: 'tech:sqlite',
    version: '1.0.0',
    type: 'tech',
    name: 'SQLite Technology Pack',
    description: 'Embedded database workflow and schema management.',
    dependencies: ['core'],
    conflicts: [],
    assets: [
      { type: 'skill', src: 'skills/test/SKILL.md', dest: 'skills/test/SKILL.md' },
      { type: 'template', src: 'templates/docs/test.md', dest: 'docs/ai-workflow/test.md' }
    ]
  };
  assert.equal(validatePack(valid), true);
});

test('pack-contract: rejects invalid id or missing fields', () => {
  assert.throws(() => validatePack(null), /non-null object/);
  assert.throws(() => validatePack({}), /"id" is required/);
  assert.throws(() => validatePack({ id: 'Invalid ID!' }), /lowercase alphanumeric/);
  assert.throws(() => validatePack({ id: 'valid-id', version: 'not-semver' }), /semver/);
  assert.throws(() => validatePack({ id: 'valid-id', version: '1.0.0', type: 'unknown' }), /invalid type/);
  assert.throws(() => validatePack({ id: 'valid-id', version: '1.0.0', type: 'core', name: '' }), /display name/);
  assert.throws(() => validatePack({ id: 'valid-id', version: '1.0.0', type: 'core', name: 'Name', description: '' }), /description/);
  assert.throws(() => validatePack({ id: 'valid-id', version: '1.0.0', type: 'core', name: 'Name', description: 'Desc', assets: 'not-array' }), /"assets" array/);
});

test('builtin-packs: all built-in packs conform to contract', () => {
  assert(BUILTIN_PACKS.length >= 4, 'Harus ada minimal 4 built-in packs di Phase 1');
  for (const pack of BUILTIN_PACKS) {
    assert.equal(validatePack(pack), true, `Pack ${pack.id} harus valid`);
    assert(PACK_REGISTRY.has(pack.id));
  }
});

test('pack-resolver: valid core-only resolution', () => {
  const res = resolvePacks(['core']);
  assert.deepEqual(res.requested, ['core']);
  assert.deepEqual(res.dependencies, []);
  assert.deepEqual(res.resolved, ['core']);
  assert.equal(res.packs.length, 1);
  assert.equal(res.packs[0].id, 'core');
});

test('pack-resolver: a role that automatically requires core (distinguishing requested vs dependencies)', () => {
  const res = resolvePacks(['role:frontend']);
  assert.deepEqual(res.requested, ['role:frontend']);
  assert.deepEqual(res.dependencies, ['core']);
  assert.deepEqual(res.resolved, ['core', 'role:frontend']);
  assert.equal(res.packs.length, 2);
  assert.equal(res.packs[0].id, 'core');
  assert.equal(res.packs[1].id, 'role:frontend');
});

test('pack-resolver: composite role:fullstack resolution', () => {
  const res = resolvePacks(['role:fullstack']);
  assert.deepEqual(res.requested, ['role:fullstack']);
  assert.deepEqual(res.dependencies, ['core', 'role:frontend', 'role:backend']);
  assert.deepEqual(res.resolved, ['core', 'role:frontend', 'role:backend', 'role:fullstack']);
});

test('pack-resolver: multiple packs sharing an asset avoids duplicates and reports them', () => {
  const sharedAssetRegistry = new Map([
    ['pack-a', {
      id: 'pack-a',
      version: '1.0.0',
      type: 'role',
      name: 'Pack A',
      description: 'First pack',
      dependencies: [],
      conflicts: [],
      assets: [
        { type: 'template', src: 'templates/docs/shared.md', dest: 'docs/ai-workflow/shared.md' },
        { type: 'skill', src: 'skills/a/SKILL.md', dest: 'skills/a/SKILL.md' }
      ]
    }],
    ['pack-b', {
      id: 'pack-b',
      version: '1.0.0',
      type: 'role',
      name: 'Pack B',
      description: 'Second pack',
      dependencies: [],
      conflicts: [],
      assets: [
        { type: 'template', src: 'templates/docs/shared.md', dest: 'docs/ai-workflow/shared.md' },
        { type: 'skill', src: 'skills/b/SKILL.md', dest: 'skills/b/SKILL.md' }
      ]
    }]
  ]);

  const res = resolvePacks(['pack-a', 'pack-b'], sharedAssetRegistry);
  assert.equal(res.resolved.length, 2);

  // Asset list must be deduplicated
  assert.equal(res.assets.length, 3, '3 unique assets across 2 packs');

  // Duplicates list must record the collision
  assert.equal(res.duplicates.length, 1);
  assert.equal(res.duplicates[0].dest, 'docs/ai-workflow/shared.md');
  assert.deepEqual(res.duplicates[0].contributedBy, ['pack-a', 'pack-b']);
});

test('pack-resolver: throws actionable error on missing dependency', () => {
  const brokenRegistry = new Map([
    ['pack-orphan', {
      id: 'pack-orphan',
      dependencies: ['pack-nonexistent'],
      conflicts: [],
      assets: []
    }]
  ]);

  assert.throws(
    () => resolvePacks(['pack-orphan'], brokenRegistry),
    /Dependensi tidak ditemukan: "pack-nonexistent" dibutuhkan oleh "pack-orphan"/
  );
});

test('pack-resolver: detects and prevents dependency cycles with complete trace', () => {
  const cyclicRegistry = new Map([
    ['pack-x', { id: 'pack-x', dependencies: ['pack-y'], conflicts: [], assets: [] }],
    ['pack-y', { id: 'pack-y', dependencies: ['pack-z'], conflicts: [], assets: [] }],
    ['pack-z', { id: 'pack-z', dependencies: ['pack-x'], conflicts: [], assets: [] }]
  ]);

  assert.throws(
    () => resolvePacks(['pack-x'], cyclicRegistry),
    /Deteksi siklus dependensi: pack-x -> pack-y -> pack-z -> pack-x/
  );
});

test('pack-resolver: detects and prevents declared conflicting packs', () => {
  const conflictRegistry = new Map([
    ['engine:a', { id: 'engine:a', dependencies: [], conflicts: ['engine:b'], assets: [] }],
    ['engine:b', { id: 'engine:b', dependencies: [], conflicts: ['engine:a'], assets: [] }]
  ]);

  assert.throws(
    () => resolvePacks(['engine:a', 'engine:b'], conflictRegistry),
    /Konflik pack terdeteksi: "engine:a" tidak kompatibel dengan "engine:b"/
  );
});

test('pack-resolver: throws on unknown pack ID', () => {
  assert.throws(
    () => resolvePacks(['role:unknown']),
    /Pack tidak dikenal: "role:unknown"/
  );
});

test('pack-resolver: deterministic resolution across repeated runs', () => {
  const inputOrder1 = ['role:backend', 'role:frontend'];
  const inputOrder2 = ['role:frontend', 'role:backend'];

  const res1 = resolvePacks(inputOrder1);
  const res2 = resolvePacks(inputOrder2);

  // Core must always come first
  assert.equal(res1.resolved[0], 'core');
  assert.equal(res2.resolved[0], 'core');

  // Both should resolve the exact same set of packs
  assert.deepEqual(new Set(res1.resolved), new Set(['core', 'role:frontend', 'role:backend']));
  assert.deepEqual(new Set(res2.resolved), new Set(['core', 'role:frontend', 'role:backend']));
});

test('pack-resolver: resolvePackFiles produces correct workspace paths and deduplicates', () => {
  const targetDir = 'D:/test-workspace';
  const res = resolvePacks(['role:fullstack']);
  const files = resolvePackFiles(res.packs, 'workspace', targetDir, rootDir);

  assert(files.length > 0);

  // Check that skills and rules go into .agents/
  const skillFile = files.find(f => f.type === 'skill');
  assert(skillFile);
  assert(skillFile.dest.includes('.agents'));

  const ruleFile = files.find(f => f.type === 'rule');
  assert(ruleFile);
  assert(ruleFile.dest.includes('.agents'));

  // Check templates are placed in docs/ai-workflow/
  const templateFile = files.find(f => f.type === 'template');
  assert(templateFile);
  assert(templateFile.dest.includes('docs'));

  // Verify all destination paths are unique (deduplicated)
  const destSet = new Set(files.map(f => f.dest));
  assert.equal(destSet.size, files.length, 'Semua dest path harus unik (ter-deduplikasi)');
});

test('pack-resolver: resolvePackFiles omits templates in global scope', () => {
  const globalTarget = 'C:/Users/TestUser/.gemini/config';
  const res = resolvePacks(['role:frontend']);
  const files = resolvePackFiles(res.packs, 'global', globalTarget, rootDir);

  const templates = files.filter(f => f.type === 'template');
  assert.equal(templates.length, 0, 'Global scope tidak boleh menyertakan template dokumen');

  const rule = files.find(f => f.type === 'rule');
  assert(rule);
  assert(rule.dest.includes('vibe-kit-engineering-standards.md'));
});

test('previewResolution: returns structured preview without modifying filesystem', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-test-'));
  try {
    const resolution = resolvePacks(['role:frontend']);
    const preview = previewResolution(resolution, 'workspace', target, rootDir);

    assert.deepEqual(preview.requested, ['role:frontend']);
    assert.deepEqual(preview.dependencies, ['core']);
    assert.deepEqual(preview.resolvedPacks, ['core', 'role:frontend']);
    assert(preview.packContributions.length >= 2);
    assert(preview.fileActions.length > 0);

    // All file actions should be CREATE since target is fresh
    for (const fa of preview.fileActions) {
      assert.equal(fa.action, 'CREATE');
    }

    // Verify ZERO filesystem mutations were performed
    assert.equal(fs.existsSync(path.join(target, '.agents')), false, '.agents tidak boleh dibuat saat preview');
    assert.equal(fs.existsSync(path.join(target, 'docs')), false, 'docs tidak boleh dibuat saat preview');
    assert.equal(fs.existsSync(path.join(target, MANIFEST)), false, 'manifest tidak boleh ditulis saat preview');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('legacy-adapter: mapLegacyProfileToPacks maps all supported profiles', () => {
  assert.deepEqual(mapLegacyProfileToPacks('base'), ['core']);
  assert.deepEqual(mapLegacyProfileToPacks('frontend'), ['role:frontend']);
  assert.deepEqual(mapLegacyProfileToPacks('backend'), ['role:backend']);
  assert.deepEqual(mapLegacyProfileToPacks('fullstack'), ['role:fullstack']);

  assert.throws(() => mapLegacyProfileToPacks('invalid'), /Profil tidak valid/);
});

test('cli integration: vibe-kit init with --pack installs explicitly requested pack', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-pack-cli-'));
  try {
    const res = runCli(['init', '--target', target, '--scope', 'workspace', '--pack', 'core', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifestPath = path.join(target, MANIFEST);
    assert(fs.existsSync(manifestPath));

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(manifest.packs, ['core']);
    assert(manifest.paths.includes('.agents/rules/engineering-standards.md'));
    assert(manifest.paths.includes('.agents/skills/project-onboarding/SKILL.md'));
    // Role skills should NOT be installed when requesting core only
    assert.equal(manifest.paths.includes('.agents/skills/ui-implementation/SKILL.md'), false);
    assert.equal(manifest.paths.includes('.agents/skills/backend-feature/SKILL.md'), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('cli integration: init dry-run displays pack preview without writing files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-cli-'));
  try {
    const res = runCli(['init', '--target', target, '--scope', 'workspace', '--pack', 'role:backend', '--dry-run']);
    assert.equal(res.status, 0, res.stderr);

    assert.match(res.stdout, /DRY-RUN RESOLUTION PREVIEW/);
    assert.match(res.stdout, /Requested packs:\s+role:backend/);
    assert.match(res.stdout, /Included dependencies:\s+core/);
    assert.match(res.stdout, /Dry-run selesai/);

    // Verify zero writes
    assert.equal(fs.existsSync(path.join(target, '.agents')), false);
    assert.equal(fs.existsSync(path.join(target, MANIFEST)), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('cli compatibility: existing v0.1.0 manifest updates cleanly without regeneration', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-legacy-manifest-'));
  try {
    // 1. Create a workspace with a legacy v0.1.0 manifest (no 'packs' array)
    const legacyManifest = {
      toolkit: '@doni354/vibe-kit',
      version: '0.1.0',
      scope: 'workspace',
      profile: 'frontend',
      installedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      paths: [
        '.agents/rules/engineering-standards.md',
        '.agents/skills/project-onboarding/SKILL.md'
      ],
      files: {}
    };

    // Populate files on disk with current content so update sees them
    fs.mkdirSync(path.join(target, '.agents', 'rules'), { recursive: true });
    fs.mkdirSync(path.join(target, '.agents', 'skills', 'project-onboarding'), { recursive: true });

    const ruleSrc = path.join(rootDir, 'rules', 'workspace', 'engineering-standards.md');
    const skillSrc = path.join(rootDir, 'skills', 'project-onboarding', 'SKILL.md');

    fs.copyFileSync(ruleSrc, path.join(target, '.agents', 'rules', 'engineering-standards.md'));
    fs.copyFileSync(skillSrc, path.join(target, '.agents', 'skills', 'project-onboarding', 'SKILL.md'));

    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(legacyManifest, null, 2));

    // 2. Run update on the legacy manifest
    const updateRes = runCli(['update', '--target', target, '--scope', 'workspace', '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);

    // 3. Manifest should be intact, migrated with packs, and verified
    const updated = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(updated.profile, 'frontend');
    assert(Array.isArray(updated.packs));
    assert(updated.paths.length >= 2);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('pack-resolver: asset conflict with different content throws actionable error in resolvePacks', () => {
  const conflictingRegistry = new Map([
    ['pack-1', {
      id: 'pack-1',
      version: '1.0.0',
      type: 'role',
      name: 'Pack 1',
      description: 'First pack',
      dependencies: [],
      conflicts: [],
      assets: [
        { type: 'template', src: 'src-1.md', dest: 'docs/ai-workflow/shared.md', content: 'Content 1' }
      ]
    }],
    ['pack-2', {
      id: 'pack-2',
      version: '1.0.0',
      type: 'role',
      name: 'Pack 2',
      description: 'Second pack',
      dependencies: [],
      conflicts: [],
      assets: [
        { type: 'template', src: 'src-2.md', dest: 'docs/ai-workflow/shared.md', content: 'Different Content 2' }
      ]
    }]
  ]);

  assert.throws(
    () => resolvePacks(['pack-1', 'pack-2'], conflictingRegistry),
    /Konflik aset terdeteksi pada destination "docs\/ai-workflow\/shared\.md"/
  );
});

test('pack-resolver: asset conflict with different content throws actionable error in resolvePackFiles', () => {
  const packs = [
    {
      id: 'pack-a',
      assets: [
        { type: 'template', src: 'templates/docs/PROJECT_CONTEXT.md', dest: 'docs/ai-workflow/guide.md' }
      ]
    },
    {
      id: 'pack-b',
      assets: [
        { type: 'template', src: 'templates/docs/README.md', dest: 'docs/ai-workflow/guide.md' }
      ]
    }
  ];

  assert.throws(
    () => resolvePackFiles(packs, 'workspace', rootDir, rootDir),
    /Konflik aset terdeteksi pada "docs\/ai-workflow\/guide\.md": pack "pack-a" dan pack "pack-b" menyediakan konten yang berbeda/
  );
});

test('dry-run: preview accurately distinguishes CREATE, IDENTICAL, and CONFLICT with conflict policy', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-audit-'));
  try {
    // 1. Initial workspace with one identical file and one modified/conflicting file
    const resolution = resolvePacks(['role:frontend']);
    const files = resolvePackFiles(resolution.packs, 'workspace', target, rootDir);

    // Create one identical file: engineering-standards.md
    const ruleFile = files.find(f => f.relPath.includes('engineering-standards.md'));
    assert(ruleFile);
    fs.mkdirSync(path.dirname(ruleFile.dest), { recursive: true });
    fs.copyFileSync(ruleFile.src, ruleFile.dest);

    // Create one conflicting file: plan.md with different content
    const planFile = files.find(f => f.relPath.includes('plan.md'));
    assert(planFile);
    fs.mkdirSync(path.dirname(planFile.dest), { recursive: true });
    fs.writeFileSync(planFile.dest, '# Modified user plan\n');

    // Test preview with conflict=replace
    const previewReplace = previewResolution(resolution, 'workspace', target, rootDir, fs, { conflict: 'replace' });
    const ruleAction = previewReplace.fileActions.find(f => f.relPath === ruleFile.relPath);
    const planAction = previewReplace.fileActions.find(f => f.relPath === planFile.relPath);
    const newAction = previewReplace.fileActions.find(f => f.relPath.includes('design-system.md'));

    assert.equal(ruleAction.action, 'IDENTICAL');
    assert.equal(ruleAction.policyAction, 'UNCHANGED');

    assert.equal(planAction.action, 'CONFLICT');
    assert.equal(planAction.policyAction, 'REPLACE');

    assert.equal(newAction.action, 'CREATE');
    assert.equal(newAction.policyAction, 'CREATE');

    // Test preview with conflict=keep
    const previewKeep = previewResolution(resolution, 'workspace', target, rootDir, fs, { conflict: 'keep' });
    const planActionKeep = previewKeep.fileActions.find(f => f.relPath === planFile.relPath);
    assert.equal(planActionKeep.action, 'CONFLICT');
    assert.equal(planActionKeep.policyAction, 'KEEP');

    // Test preview default (non-interactive / yes)
    const previewDefault = previewResolution(resolution, 'workspace', target, rootDir, fs, { yes: true });
    const planActionDefault = previewDefault.fileActions.find(f => f.relPath === planFile.relPath);
    assert.equal(planActionDefault.action, 'CONFLICT');
    assert.equal(planActionDefault.policyAction, 'KEEP (DEFAULT)');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('dry-run: preview rejects path escaping via symlink and remains strictly read-only', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-symlink-'));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-preview-outside-'));
  try {
    // Create malicious symlink inside target pointing outside
    fs.mkdirSync(target, { recursive: true });
    try {
      fs.symlinkSync(outsideDir, path.join(target, '.agents'), 'junction');
    } catch {
      // Skip if permissions prevent symlink creation on Windows
      return;
    }

    const resolution = resolvePacks(['core']);
    assert.throws(
      () => previewResolution(resolution, 'workspace', target, rootDir),
      /Path tujuan tidak aman di luar folder target/
    );

    // Verify 0 files written to outsideDir
    assert.equal(fs.readdirSync(outsideDir).length, 0);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('cli integration: init accepts --profile and --pack simultaneously and combines them additively', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-combo-cli-'));
  try {
    const res = runCli(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--pack', 'role:backend', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(manifest.profile, 'base');
    assert.deepEqual(manifest.packs, ['core', 'role:backend']);

    // Check that base (core) skills are present
    assert(manifest.paths.includes('.agents/skills/project-onboarding/SKILL.md'));
    // Check that backend skill is present
    assert(manifest.paths.includes('.agents/skills/backend-feature/SKILL.md'));
    // Check that frontend skill is NOT present
    assert.equal(manifest.paths.includes('.agents/skills/ui-implementation/SKILL.md'), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('cli integration: init deduplicates duplicate --pack flags and rejects empty pack', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-dedup-cli-'));
  try {
    // Duplicate pack test
    const res = runCli(['init', '--target', target, '--scope', 'workspace', '--pack', 'core,core', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core']);

    // Empty pack test
    const emptyRes = runCli(['init', '--target', target, '--scope', 'workspace', '--pack', '   ', '--yes']);
    assert.notEqual(emptyRes.status, 0);
    assert.match(emptyRes.stderr, /Flag "--pack" membutuhkan/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('cli integration: update with new --pack updates packs in manifest and retains assets from unselected packs', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-update-pack-change-'));
  try {
    // 1. Install with fullstack (includes frontend, backend, core)
    const initRes = runCli(['init', '--target', target, '--scope', 'workspace', '--profile', 'fullstack', '--yes']);
    assert.equal(initRes.status, 0, initRes.stderr);

    const initManifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert(initManifest.paths.includes('.agents/skills/ui-implementation/SKILL.md'));
    assert(initManifest.paths.includes('.agents/skills/backend-feature/SKILL.md'));

    // 2. Run update with --pack role:backend only
    const updateRes = runCli(['update', '--target', target, '--scope', 'workspace', '--pack', 'role:backend', '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);

    const updatedManifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    // Manifest packs must be updated to the new selection
    assert.deepEqual(updatedManifest.packs, ['core', 'role:backend']);

    // Crucial safety guarantee: frontend skill was NOT deleted; it is RETAINED!
    const frontendSkillPath = path.join(target, '.agents', 'skills', 'ui-implementation', 'SKILL.md');
    assert(fs.existsSync(frontendSkillPath), 'Frontend skill must be retained and not deleted');
    assert(updatedManifest.paths.includes('.agents/skills/ui-implementation/SKILL.md'), 'Retained asset must stay tracked in manifest');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

