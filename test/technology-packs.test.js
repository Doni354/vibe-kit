import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { BUILTIN_PACKS, PACK_REGISTRY } from '../lib/packs.js';
import { validatePack } from '../lib/pack-contract.js';
import { resolvePacks, resolvePackFiles } from '../lib/pack-resolver.js';
import { CONFIG_FILE, computeResolvedConfig, validateConfig } from '../lib/config.js';
import { detectProject } from '../lib/detector.js';

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

test('tech packs: registry contains tech:firebase and tech:postgresql with valid contract', () => {
  const firebasePack = PACK_REGISTRY.get('tech:firebase');
  assert.ok(firebasePack, 'tech:firebase must be registered');
  assert.equal(firebasePack.type, 'tech');
  assert.deepEqual(firebasePack.dependencies, ['core'], 'tech:firebase must depend only on core, not backend');
  assert.equal(validatePack(firebasePack), true);

  const pgPack = PACK_REGISTRY.get('tech:postgresql');
  assert.ok(pgPack, 'tech:postgresql must be registered');
  assert.equal(pgPack.type, 'tech');
  assert.deepEqual(pgPack.dependencies, ['core'], 'tech:postgresql must depend only on core, not backend');
  assert.equal(validatePack(pgPack), true);
});

test('tech packs: resolution and composition with role packs', () => {
  // 1. Standalone tech pack resolution
  const fbRes = resolvePacks(['tech:firebase'], PACK_REGISTRY);
  assert.deepEqual(fbRes.resolved, ['core', 'tech:firebase']);
  assert.deepEqual(fbRes.dependencies, ['core']);

  const pgRes = resolvePacks(['tech:postgresql'], PACK_REGISTRY);
  assert.deepEqual(pgRes.resolved, ['core', 'tech:postgresql']);

  // 2. Composition with role:frontend (e.g. client app using Firebase directly)
  const feFbRes = resolvePacks(['role:frontend', 'tech:firebase'], PACK_REGISTRY);
  assert.deepEqual(feFbRes.resolved, ['core', 'role:frontend', 'tech:firebase']);
  assert.equal(feFbRes.resolved.includes('role:backend'), false, 'Frontend + Firebase must NOT force backend role');

  // 3. Composition with role:backend (e.g. Node API using PostgreSQL)
  const bePgRes = resolvePacks(['role:backend', 'tech:postgresql'], PACK_REGISTRY);
  assert.deepEqual(bePgRes.resolved, ['core', 'role:backend', 'tech:postgresql']);

  // 4. Composition with role:fullstack
  const fsPgRes = resolvePacks(['role:fullstack', 'tech:postgresql'], PACK_REGISTRY);
  assert.deepEqual(fsPgRes.resolved, ['core', 'role:frontend', 'role:backend', 'role:fullstack', 'tech:postgresql']);

  // 5. Composition with role:video-motion
  const vmFbRes = resolvePacks(['role:video-motion', 'tech:firebase'], PACK_REGISTRY);
  assert.deepEqual(vmFbRes.resolved, ['core', 'role:video-motion', 'tech:firebase']);

  // 6. Dual technology packs composition
  const dualRes = resolvePacks(['role:backend', 'tech:postgresql', 'tech:firebase'], PACK_REGISTRY);
  assert.deepEqual(dualRes.resolved, ['core', 'role:backend', 'tech:postgresql', 'tech:firebase']);
});

test('tech packs: asset resolution produces correct paths and prevents destination conflicts', () => {
  const res = resolvePacks(['role:fullstack', 'tech:postgresql', 'tech:firebase'], PACK_REGISTRY);
  const files = resolvePackFiles(res.packs, 'workspace', '/dummy/target', ROOT);

  const dests = files.map(f => f.dest);
  // Ensure no destination duplicates in the resolved files
  const destSet = new Set(dests);
  assert.equal(destSet.size, dests.length, 'Every resolved asset must have a unique destination');

  // Verify skills are present
  assert(dests.some(d => d.endsWith(path.join('.agents', 'skills', 'firebase', 'SKILL.md'))));
  assert(dests.some(d => d.endsWith(path.join('.agents', 'skills', 'postgresql', 'SKILL.md'))));
  assert(dests.some(d => d.endsWith(path.join('.agents', 'skills', 'fullstack-integration', 'SKILL.md'))));
  assert(dests.some(d => d.endsWith(path.join('.agents', 'skills', 'backend-feature', 'SKILL.md'))));
  assert(dests.some(d => d.endsWith(path.join('.agents', 'skills', 'ui-implementation', 'SKILL.md'))));
});

test('tech packs: content verification of skills/firebase/SKILL.md', () => {
  const content = fs.readFileSync(path.join(ROOT, 'skills', 'firebase', 'SKILL.md'), 'utf8');

  // Verify Antigravity frontmatter
  assert.match(content, /name:\s*firebase/);
  assert.match(content, /description:\s*.+/);

  // Verify core required disciplines
  assert.match(content, /Service Scoping/i);
  assert.match(content, /Trust Boundary/i);
  assert.match(content, /bypass Firebase Security Rules entirely/i, 'Must note that Admin SDK bypasses security rules');
  assert.match(content, /Firestore Data Modeling/i);
  assert.match(content, /Security Rules/i);
  assert.match(content, /Cloud Functions/i);
  assert.match(content, /Local Emulator Suite/i);
  assert.match(content, /Deployment/i);
});

test('tech packs: content verification of skills/postgresql/SKILL.md', () => {
  const content = fs.readFileSync(path.join(ROOT, 'skills', 'postgresql', 'SKILL.md'), 'utf8');

  // Verify Antigravity frontmatter
  assert.match(content, /name:\s*postgresql/);
  assert.match(content, /description:\s*.+/);

  // Verify core required disciplines
  assert.match(content, /ORM Neutrality/i);
  assert.match(content, /Relational Schema Design/i);
  assert.match(content, /Normalization/i);
  assert.match(content, /TIMESTAMPTZ/i);
  assert.match(content, /NUMERIC/i);
  assert.match(content, /Indexing Strategy/i);
  assert.match(content, /EXPLAIN/i);
  assert.match(content, /Parameterized Queries/i);
  assert.match(content, /Reversible Migrations/i);
  assert.match(content, /Expand-and-Contract/i);
  assert.match(content, /Connection Pooling/i);
});

test('tech packs: detection of postgresql and firebase across manifests and configs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-tech-det-'));
  try {
    // 1. package.json with pg and firebase
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: {
        pg: '^8.11.0',
        firebase: '^10.0.0'
      }
    }));

    const det = detectProject(tmp);
    const techIds = det.technologies.map(t => t.id);
    assert(techIds.includes('postgresql'), 'postgresql should be detected');
    assert(techIds.includes('firebase'), 'firebase should be detected');

    // 2. firestore.rules detection
    fs.writeFileSync(path.join(tmp, 'firestore.rules'), 'rules_version = "2";');
    const detRules = detectProject(tmp);
    assert(detRules.technologies.some(t => t.id === 'firebase'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('tech packs: explicit overrides take precedence over detected facts', () => {
  const detected = {
    technologies: [
      { id: 'postgresql', name: 'PostgreSQL', category: 'database', confidence: 'high' }
    ]
  };

  // Disabling detected postgresql
  const resolvedDisabled = computeResolvedConfig(detected, { disabled: ['postgresql'] });
  assert.equal(resolvedDisabled.technologies.some(t => t.id === 'postgresql'), false);

  // Explicitly choosing packs via overrides.packs
  const resolvedPacks = computeResolvedConfig(detected, {
    packs: ['role:frontend', 'tech:firebase']
  });
  assert.deepEqual(resolvedPacks.effectivePacks, ['role:frontend', 'tech:firebase']);
});

test('cli integration: init installs tech:firebase cleanly with manifest tracking', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-tech-fb-'));
  try {
    const res = runCli(['init', '--target', tmp, '--pack', 'tech:firebase', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'tech:firebase']);

    const skillPath = path.join(tmp, '.agents', 'skills', 'firebase', 'SKILL.md');
    assert(fs.existsSync(skillPath), 'firebase SKILL.md must be installed');

    const coreSkill = path.join(tmp, '.agents', 'skills', 'verification', 'SKILL.md');
    assert(fs.existsSync(coreSkill), 'core skill must also be installed as dependency');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: init combines profile and tech pack additively', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-combo-'));
  try {
    const res = runCli(['init', '--target', tmp, '--profile', 'frontend', '--pack', 'tech:postgresql', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:frontend', 'tech:postgresql']);

    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'ui-implementation', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'postgresql', 'SKILL.md')));
    assert.equal(fs.existsSync(path.join(tmp, '.agents', 'skills', 'backend-feature', 'SKILL.md')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: dry-run does not write any files or modify disk', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-dry-tech-'));
  try {
    const res = runCli(['init', '--target', tmp, '--pack', 'tech:postgresql', '--dry-run']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /DRY-RUN RESOLUTION PREVIEW/);
    assert.match(res.stdout, /tech:postgresql/);

    // Verify disk remains completely empty
    assert.equal(fs.existsSync(path.join(tmp, MANIFEST)), false);
    assert.equal(fs.existsSync(path.join(tmp, '.agents')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: update preserves modified tech skills and adds new packs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-up-tech-'));
  try {
    // 1. Initial install with tech:firebase
    runCli(['init', '--target', tmp, '--pack', 'tech:firebase', '--yes']);
    const fbSkill = path.join(tmp, '.agents', 'skills', 'firebase', 'SKILL.md');

    // 2. Modify firebase skill
    fs.appendFileSync(fbSkill, '\n<!-- Custom user modification -->');

    // 3. Update with added tech:postgresql
    const upRes = runCli(['update', '--target', tmp, '--pack', 'tech:firebase,tech:postgresql', '--yes']);
    assert.equal(upRes.status, 0, upRes.stderr);

    // Modified file was kept
    const modifiedContent = fs.readFileSync(fbSkill, 'utf8');
    assert.match(modifiedContent, /Custom user modification/);

    // New tech skill was installed
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'postgresql', 'SKILL.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: doctor reports PASS for project with tech packs installed', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-doc-tech-'));
  try {
    runCli(['init', '--target', tmp, '--pack', 'tech:postgresql', '--yes']);

    const docRes = runCli(['doctor', '--target', tmp]);
    assert.equal(docRes.status, 0, docRes.stderr);
    assert.match(docRes.stdout, /Status Diagnostik: PASS/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('phase 4.1: postgresql version-sensitive guidance and migration constraints', () => {
  const content = fs.readFileSync(path.join(ROOT, 'skills', 'postgresql', 'SKILL.md'), 'utf8');

  // 1. UUIDv7 version sensitivity
  assert.match(content, /PostgreSQL 17/i, 'Must note that native uuidv7 is built-in in PostgreSQL 17+');
  assert.match(content, /gen_random_uuid/i, 'Must mention gen_random_uuid for PostgreSQL 16 and earlier');

  // 2. Transactional migration constraints for CREATE INDEX CONCURRENTLY
  assert.match(content, /cannot run inside an explicit transaction block/i, 'Must state CREATE INDEX CONCURRENTLY cannot run inside transaction blocks');
  assert.match(content, /BEGIN \.\.\. COMMIT/i);

  // 3. ALTER TABLE ADD COLUMN DEFAULT rules
  assert.match(content, /PostgreSQL 11/i, 'Must note that PG 11+ supports metadata-only constant defaults without table rewrite');
  assert.match(content, /volatile/i, 'Must warn that volatile defaults cause table rewrites');

  // 4. Isolation level retry invariant
  assert.match(content, /40001/i, 'Must document SQLSTATE 40001 serialization errors');
  assert.match(content, /retry loop/i, 'Must require application retry loop for repeatable read or serializable');

  // 5. BRIN indexing for append-only data
  assert.match(content, /BRIN/i, 'Must cover BRIN indexing for timestamp/append-only tables');

  // 6. PgBouncer session vs transaction pooling
  assert.match(content, /Transaction Pooling/i, 'Must document transaction pooling constraints');
  assert.match(content, /prepared statement/i, 'Must document prepared statement constraints with poolers');
});

test('phase 4.1: postgresql EXPLAIN ANALYZE execution warning', () => {
  const content = fs.readFileSync(path.join(ROOT, 'skills', 'postgresql', 'SKILL.md'), 'utf8');

  // Must warn that EXPLAIN ANALYZE actually executes queries
  assert.match(content, /actually executes/i, 'Must contain warning that EXPLAIN ANALYZE executes queries');
  assert.match(content, /MUTATION SAFETY/i, 'Must emphasize mutation safety on DELETE/UPDATE/INSERT');
  assert.match(content, /ROLLBACK/i, 'Must demonstrate testing mutations inside rolled-back transaction');
});

test('phase 4.1: firebase service-specific guidance and authorization patterns', () => {
  const content = fs.readFileSync(path.join(ROOT, 'skills', 'firebase', 'SKILL.md'), 'utf8');

  // 1. Service-specific scoping
  assert.match(content, /Service-Specific Adaptation/i, 'Must adapt to active services rather than assuming all services');

  // 2. Non-UID authorization patterns
  assert.match(content, /request\.auth\.token/i, 'Must cover Custom Claims pattern');
  assert.match(content, /members/i, 'Must cover collaborator/membership pattern');
  assert.match(content, /get\(/i, 'Must cover dynamic RBAC via document lookup');
  assert.match(content, /allow read:\s*if true/i, 'Must cover public read pattern with restricted write');

  // 3. Distributed counters context
  assert.match(content, /1 write per second/i, 'Must only recommend distributed counters when write rate exceeds ~1/sec');
  assert.match(content, /FieldValue\.increment/i, 'Must mention FieldValue.increment for standard counters');

  // 4. Bounded arrays vs unbounded subcollections
  assert.match(content, /Bounded Arrays/i, 'Must explain that small bounded arrays are idiomatic');
  assert.match(content, /Unbounded Collections/i, 'Must warn against unbounded arrays growing past 1 MiB');

  // 5. Emulator vs production distinctions
  assert.match(content, /Emulator Differences from Production/i, 'Must distinguish emulators from production');
  assert.match(content, /quotas/i, 'Must note that emulators do not enforce production quotas or throughput limits');
});

test('phase 4.1: monorepo with heterogeneous technologies per workspace', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-monorepo-tech-'));
  try {
    // Monorepo root with package.json workspaces
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      name: 'root-monorepo',
      private: true,
      workspaces: ['apps/*', 'services/*', 'packages/*']
    }));

    // apps/web: React + Firebase
    const webDir = path.join(tmp, 'apps', 'web');
    fs.mkdirSync(webDir, { recursive: true });
    fs.writeFileSync(path.join(webDir, 'package.json'), JSON.stringify({
      name: 'web-app',
      dependencies: { react: '^18.2.0', firebase: '^10.0.0' }
    }));

    // apps/mobile: Flutter + Firebase
    const mobileDir = path.join(tmp, 'apps', 'mobile');
    fs.mkdirSync(mobileDir, { recursive: true });
    fs.writeFileSync(path.join(mobileDir, 'pubspec.yaml'), `
name: mobile_app
environment:
  sdk: '>=3.0.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^2.0.0
  cloud_firestore: ^4.0.0
`);

    // services/api: Node.js + PostgreSQL
    const apiDir = path.join(tmp, 'services', 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({
      name: 'api-service',
      dependencies: { express: '^4.19.0', pg: '^8.11.0' }
    }));

    // packages/shared: TypeScript
    const sharedDir = path.join(tmp, 'packages', 'shared');
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(path.join(sharedDir, 'package.json'), JSON.stringify({
      name: 'shared-utils',
      devDependencies: { typescript: '^5.0.0' }
    }));
    fs.writeFileSync(path.join(sharedDir, 'tsconfig.json'), '{"compilerOptions":{}}');

    // Run project stack detection
    const det = detectProject(tmp);
    assert.equal(det.monorepo.isMonorepo, true);
    assert.equal(det.monorepo.packages.length, 4, 'Should detect all 4 sub-packages across apps, services, packages');

    const pkgMap = new Map(det.monorepo.packages.map(p => [p.path, p]));

    // Check apps/web
    const webPkg = pkgMap.get('apps/web');
    assert.ok(webPkg);
    const webTechIds = webPkg.technologies.map(t => t.id);
    assert(webTechIds.includes('react'));
    assert(webTechIds.includes('firebase'));
    assert.deepEqual(webPkg.recommendedPacks, ['role:frontend']);

    // Check apps/mobile
    const mobilePkg = pkgMap.get('apps/mobile');
    assert.ok(mobilePkg);
    const mobileTechIds = mobilePkg.technologies.map(t => t.id);
    assert(mobileTechIds.includes('flutter'));
    assert(mobileTechIds.includes('dart'));
    assert(mobileTechIds.includes('firebase'), 'Flutter Firebase should be detected via pubspec.yaml');
    assert.deepEqual(mobilePkg.recommendedPacks, ['role:frontend']);

    // Check services/api
    const apiPkg = pkgMap.get('services/api');
    assert.ok(apiPkg);
    const apiTechIds = apiPkg.technologies.map(t => t.id);
    assert(apiTechIds.includes('express'));
    assert(apiTechIds.includes('postgresql'));
    assert.deepEqual(apiPkg.recommendedPacks, ['role:backend']);

    // Check packages/shared
    const sharedPkg = pkgMap.get('packages/shared');
    assert.ok(sharedPkg);
    const sharedTechIds = sharedPkg.technologies.map(t => t.id);
    assert(sharedTechIds.includes('typescript'));
    assert.deepEqual(sharedPkg.recommendedPacks, ['core']);

    // Compute resolved configuration with workspace scoping
    const resolved = computeResolvedConfig(det);
    assert.ok(resolved.workspaces, 'Monorepo must include resolved.workspaces mapping');
    assert.deepEqual(resolved.workspaces['apps/web'].effectivePacks, ['role:frontend']);
    assert.deepEqual(resolved.workspaces['services/api'].effectivePacks, ['role:backend']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('phase 4.1: global and workspace configuration conflict handling', () => {
  // 1. Conflict inside workspace overrides throws validation error
  const invalidConfig = {
    version: 1,
    overrides: {
      workspaces: {
        'services/api': {
          enabled: ['postgresql'],
          disabled: ['postgresql']
        }
      }
    }
  };
  assert.throws(
    () => validateConfig(invalidConfig),
    /Konflik override pada workspace "services\/api"/
  );

  // 2. Workspace override precedence
  const mockDetected = {
    monorepo: {
      isMonorepo: true,
      packages: [
        {
          name: 'api',
          path: 'services/api',
          technologies: [{ id: 'postgresql', name: 'PostgreSQL', category: 'database', confidence: 'high' }]
        }
      ]
    },
    technologies: [
      { id: 'postgresql', name: 'PostgreSQL', category: 'database', confidence: 'high' }
    ]
  };

  const resolved = computeResolvedConfig(mockDetected, {
    workspaces: {
      'services/api': {
        packs: ['role:backend', 'tech:postgresql']
      }
    }
  });

  assert.deepEqual(resolved.workspaces['services/api'].effectivePacks, ['role:backend', 'tech:postgresql']);
});

test('phase 4.1: backwards compatibility with single-root projects', () => {
  const singleRootDetected = {
    monorepo: { isMonorepo: false, workspaces: [] },
    technologies: [
      { id: 'nodejs', name: 'Node.js', category: 'runtime', confidence: 'high' },
      { id: 'postgresql', name: 'PostgreSQL', category: 'database', confidence: 'high' }
    ]
  };

  const resolved = computeResolvedConfig(singleRootDetected, {
    enabled: ['tech:postgresql']
  });

  // Must retain original schema shape: no workspaces key on single-root
  assert.equal(resolved.workspaces, undefined);
  assert.ok(Array.isArray(resolved.technologies));
  assert.ok(Array.isArray(resolved.recommendedPacks));
  assert.ok(Array.isArray(resolved.effectivePacks));
});

