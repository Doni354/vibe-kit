import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { BUILTIN_PACKS, PACK_REGISTRY } from '../lib/packs.js';
import { validatePack } from '../lib/pack-contract.js';
import { resolvePacks, resolvePackFiles, mapLegacyProfileToPacks } from '../lib/pack-resolver.js';
import { CONFIG_FILE } from '../lib/config.js';

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

test('role packs: registry contains all four Phase 3 roles and core', () => {
  const packIds = BUILTIN_PACKS.map(p => p.id);
  assert(packIds.includes('core'), 'core must exist');
  assert(packIds.includes('role:frontend'), 'role:frontend must exist');
  assert(packIds.includes('role:backend'), 'role:backend must exist');
  assert(packIds.includes('role:fullstack'), 'role:fullstack must exist');
  assert(packIds.includes('role:video-motion'), 'role:video-motion must exist');

  for (const pack of BUILTIN_PACKS) {
    assert.equal(validatePack(pack), true, `Pack ${pack.id} must be structurally valid`);
    assert(pack.description.length > 20, `Pack ${pack.id} must have informative description`);
  }
});

test('role packs: role:frontend resolution and asset scope', () => {
  const res = resolvePacks(['role:frontend'], PACK_REGISTRY);
  assert.deepEqual(res.resolved, ['core', 'role:frontend']);
  assert.deepEqual(res.dependencies, ['core']);

  const dests = res.assets.map(a => a.dest);
  // Frontend specific assets
  assert(dests.includes('skills/ui-implementation/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/design-system.md'));

  // Core assets included via dependency
  assert(dests.includes('skills/project-onboarding/SKILL.md'));
  assert(dests.includes('skills/verification/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/PROJECT_CONTEXT.md'));

  // Excluded: Backend or Video assets must NOT be present
  assert.equal(dests.includes('skills/backend-feature/SKILL.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/data-model.md'), false);
  assert.equal(dests.includes('skills/video-motion/SKILL.md'), false);
});

test('role packs: role:backend resolution and asset scope', () => {
  const res = resolvePacks(['role:backend'], PACK_REGISTRY);
  assert.deepEqual(res.resolved, ['core', 'role:backend']);
  assert.deepEqual(res.dependencies, ['core']);

  const dests = res.assets.map(a => a.dest);
  // Backend specific assets
  assert(dests.includes('skills/backend-feature/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/api-contracts.md'));
  assert(dests.includes('docs/ai-workflow/data-model.md'));

  // Core assets included
  assert(dests.includes('skills/project-onboarding/SKILL.md'));

  // Excluded: Frontend design-system or Video assets must NOT be present
  assert.equal(dests.includes('skills/ui-implementation/SKILL.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/design-system.md'), false);
  assert.equal(dests.includes('skills/video-motion/SKILL.md'), false);
});

test('role packs: role:fullstack includes fullstack-integration coordination workflow', () => {
  const res = resolvePacks(['role:fullstack'], PACK_REGISTRY);
  assert.deepEqual(res.resolved, ['core', 'role:frontend', 'role:backend', 'role:fullstack']);

  const dests = res.assets.map(a => a.dest);
  // Must include dedicated fullstack coordination skill and architecture template
  assert(dests.includes('skills/fullstack-integration/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/architecture.md'));

  // Must include both frontend and backend skills
  assert(dests.includes('skills/ui-implementation/SKILL.md'));
  assert(dests.includes('skills/backend-feature/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/design-system.md'));
  assert(dests.includes('docs/ai-workflow/api-contracts.md'));
});

test('role packs: role:video-motion resolution, asset scope, and engine-independence', () => {
  const res = resolvePacks(['role:video-motion'], PACK_REGISTRY);
  assert.deepEqual(res.resolved, ['core', 'role:video-motion']);
  assert.deepEqual(res.dependencies, ['core']);

  const dests = res.assets.map(a => a.dest);
  assert(dests.includes('skills/video-motion/SKILL.md'));
  assert(dests.includes('docs/ai-workflow/storyboard.md'));
  assert(dests.includes('docs/ai-workflow/video-qc-checklist.md'));

  // Must NOT include unrelated frontend or backend assets
  assert.equal(dests.includes('skills/ui-implementation/SKILL.md'), false);
  assert.equal(dests.includes('skills/backend-feature/SKILL.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/design-system.md'), false);
});

test('content verification: ui-implementation covers all required frontend disciplines', () => {
  const skillContent = fs.readFileSync(path.join(ROOT, 'skills', 'ui-implementation', 'SKILL.md'), 'utf8');
  assert.match(skillContent, /name:\s*ui-implementation/);
  assert.match(skillContent, /Avoid Unnecessary Redesigns/i);
  assert.match(skillContent, /Design Tokens/i);
  assert.match(skillContent, /Plan Implementation Before Editing/i);
  assert.match(skillContent, /Lifecycle States/i);
  assert.match(skillContent, /Accessibility \(a11y\)/i);
  assert.match(skillContent, /WCAG 2\.1 AA/);
  assert.match(skillContent, /Responsive Layouts/i);
  assert.match(skillContent, /Verification & Testing/i);
});

test('content verification: backend-feature covers all required backend disciplines', () => {
  const skillContent = fs.readFileSync(path.join(ROOT, 'skills', 'backend-feature', 'SKILL.md'), 'utf8');
  assert.match(skillContent, /name:\s*backend-feature/);
  assert.match(skillContent, /Clarify Business Requirements/i);
  assert.match(skillContent, /API Contracts/i);
  assert.match(skillContent, /Security, Authorization & Boundary Validation/i);
  assert.match(skillContent, /Strict Server-Side Validation/i);
  assert.match(skillContent, /Error Handling & Secure Observability/i);
  assert.match(skillContent, /Write & Run Comprehensive Tests/i);
  assert.match(skillContent, /Verification & Risk Reporting/i);
});

test('content verification: fullstack-integration coordinates cross-layer sequencing and avoids contract drift', () => {
  const skillContent = fs.readFileSync(path.join(ROOT, 'skills', 'fullstack-integration', 'SKILL.md'), 'utf8');
  assert.match(skillContent, /name:\s*fullstack-integration/);
  assert.match(skillContent, /Contract-First API & Data-Flow Planning/i);
  assert.match(skillContent, /Prevent Contract Drift/i);
  assert.match(skillContent, /Authentication & Authorization Propagation/i);
  assert.match(skillContent, /Implementation Sequencing/i);
  assert.match(skillContent, /Boundary State Synchronization/i);
  assert.match(skillContent, /End-to-End & Integration Verification/i);
});

test('content verification: video-motion is engine-independent and acknowledges tooling boundaries', () => {
  const skillContent = fs.readFileSync(path.join(ROOT, 'skills', 'video-motion', 'SKILL.md'), 'utf8');
  assert.match(skillContent, /name:\s*video-motion/);
  assert.match(skillContent, /Creative Brief & Audience/i);
  assert.match(skillContent, /Narrative Structure & Storyboarding/i);
  assert.match(skillContent, /Frame-Accurate Scene Breakdown/i);
  assert.match(skillContent, /Typography, Composition & Visual Hierarchy/i);
  assert.match(skillContent, /Motion Principles & Easing Consistency/i);
  assert.match(skillContent, /Asset Inventory & Provenance/i);
  assert.match(skillContent, /Audio Requirements, Sourcing & Synchronization/i);
  assert.match(skillContent, /Critical Tooling Transparency/i);
  assert.match(skillContent, /Quality Control & Delivery Checklist/i);

  // Template content assertions
  const storyboardContent = fs.readFileSync(path.join(ROOT, 'templates', 'docs', 'storyboard.md'), 'utf8');
  assert.match(storyboardContent, /Narrative Arc Outline/);
  assert.match(storyboardContent, /Frame-Accurate Scene Breakdown/);
  assert.match(storyboardContent, /Asset Inventory & Provenance/);

  const qcContent = fs.readFileSync(path.join(ROOT, 'templates', 'docs', 'video-qc-checklist.md'), 'utf8');
  assert.match(qcContent, /Timing, Pacing & Narrative Checks/);
  assert.match(qcContent, /Visual Hierarchy, Typography & Safe Zones/);
  assert.match(qcContent, /Audio & Synchronization Checks/);
  assert.match(qcContent, /Technical Delivery & Export Specifications/);
});

test('cli integration: init installs role:video-motion with exact assets', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-video-motion-'));
  try {
    const res = runCli(['init', '--target', tmp, '--pack', 'role:video-motion', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:video-motion']);

    // Check installed files
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'video-motion', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'project-onboarding', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, 'docs', 'ai-workflow', 'storyboard.md')));
    assert(fs.existsSync(path.join(tmp, 'docs', 'ai-workflow', 'video-qc-checklist.md')));

    // Unrelated assets not installed
    assert.equal(fs.existsSync(path.join(tmp, '.agents', 'skills', 'ui-implementation', 'SKILL.md')), false);
    assert.equal(fs.existsSync(path.join(tmp, '.agents', 'skills', 'backend-feature', 'SKILL.md')), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: init installs role:fullstack with fullstack-integration skill', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-fullstack-p3-'));
  try {
    const res = runCli(['init', '--target', tmp, '--pack', 'role:fullstack', '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:frontend', 'role:backend', 'role:fullstack']);

    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'fullstack-integration', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'ui-implementation', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'backend-feature', 'SKILL.md')));
    assert(fs.existsSync(path.join(tmp, 'docs', 'ai-workflow', 'architecture.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: configuration-driven role:video-motion install', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-cfg-motion-'));
  try {
    // Write .vibe-kit.json with role:video-motion in overrides.packs
    fs.writeFileSync(path.join(tmp, CONFIG_FILE), JSON.stringify({
      version: 1,
      overrides: {
        packs: ['role:video-motion']
      }
    }, null, 2));

    // Non-interactive init with no flags uses configuration
    const res = runCli(['init', '--target', tmp, '--yes']);
    assert.equal(res.status, 0, res.stderr);

    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, MANIFEST), 'utf8'));
    assert.deepEqual(manifest.packs, ['core', 'role:video-motion']);
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'video-motion', 'SKILL.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('cli integration: uninstall cleans up role pack files and removes empty parent dirs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-cli-uninstall-p3-'));
  try {
    // 1. Install role:video-motion
    runCli(['init', '--target', tmp, '--pack', 'role:video-motion', '--yes']);
    assert(fs.existsSync(path.join(tmp, '.agents', 'skills', 'video-motion', 'SKILL.md')));

    // 2. Uninstall
    const unRes = runCli(['uninstall', '--target', tmp, '--scope', 'workspace', '--yes']);
    assert.equal(unRes.status, 0, unRes.stderr);

    // Verified clean removal
    assert.equal(fs.existsSync(path.join(tmp, '.agents', 'skills', 'video-motion', 'SKILL.md')), false);
    assert.equal(fs.existsSync(path.join(tmp, MANIFEST)), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('phase 3.1 audit: video-motion formulas, pacing, and safe zones are designated as adaptable guidelines', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'video-motion', 'SKILL.md'), 'utf8');
  assert.match(skill, /customizable reference baseline/i);
  assert.match(skill, /not a rigid universal dogma/i);
  assert.match(skill, /adaptable guideline/i);
  assert.match(skill, /typical starting baseline/i);

  const storyboard = fs.readFileSync(path.join(ROOT, 'templates', 'docs', 'storyboard.md'), 'utf8');
  assert.match(storyboard, /customizable defaults/i);
  assert.match(storyboard, /standard reference example/i);

  const qc = fs.readFileSync(path.join(ROOT, 'templates', 'docs', 'video-qc-checklist.md'), 'utf8');
  assert.match(qc, /baseline guideline/i);
  assert.match(qc, /adjustable starting baseline/i);
});

test('phase 3.1 audit: legacy profile base maps to core and maintains template isolation', () => {
  const mapped = mapLegacyProfileToPacks('base');
  assert.deepEqual(mapped, ['core']);

  const res = resolvePacks(['core'], PACK_REGISTRY);
  const dests = res.assets.map(a => a.dest);

  // Core includes foundational planning templates
  assert(dests.includes('docs/ai-workflow/PROJECT_CONTEXT.md'));
  assert(dests.includes('docs/ai-workflow/README.md'));
  assert(dests.includes('docs/ai-workflow/plan.md'));

  // Core excludes specialized role templates
  assert.equal(dests.includes('docs/ai-workflow/design-system.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/api-contracts.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/data-model.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/architecture.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/storyboard.md'), false);
  assert.equal(dests.includes('docs/ai-workflow/video-qc-checklist.md'), false);
});

