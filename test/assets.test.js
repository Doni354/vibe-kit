import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILES, ROOT } from '../lib/cli.js';

test('structural: every skill defined in fullstack profile has valid SKILL.md and metadata', () => {
  const allSkills = PROFILES.fullstack;
  assert(allSkills.length >= 5, 'Harus ada minimal 5 skills');

  for (const skillName of allSkills) {
    const skillPath = path.join(ROOT, 'skills', skillName, 'SKILL.md');
    assert.equal(fs.existsSync(skillPath), true, `File skill harus ada: ${skillPath}`);

    const content = fs.readFileSync(skillPath, 'utf8');
    assert(content.startsWith('---'), `Skill ${skillName} harus diawali dengan frontmatter ---`);

    const fmEnd = content.indexOf('---', 3);
    assert(fmEnd !== -1, `Skill ${skillName} harus memiliki penutup frontmatter ---`);

    const frontmatter = content.slice(3, fmEnd);
    assert.match(frontmatter, new RegExp(`name:\\s*${skillName}`), `Frontmatter name harus cocok dengan nama direktori ${skillName}`);
    assert.match(frontmatter, /description:\s*.+/, `Frontmatter description harus ada dan tidak kosong pada ${skillName}`);

    const body = content.slice(fmEnd + 3).trim();
    assert(body.length > 200, `Instruksi skill ${skillName} harus komprehensif dan actionable`);
  }
});

test('structural: workspace and global rules have valid frontmatter and actionable guidelines', () => {
  const wsRule = path.join(ROOT, 'rules', 'workspace', 'engineering-standards.md');
  const glRule = path.join(ROOT, 'rules', 'global', 'engineering-standards.md');

  assert.equal(fs.existsSync(wsRule), true);
  assert.equal(fs.existsSync(glRule), true);

  const wsContent = fs.readFileSync(wsRule, 'utf8');
  assert.match(wsContent, /trigger:\s*always_on/);
  assert.match(wsContent, /# Workspace Engineering Standards/);

  const glContent = fs.readFileSync(glRule, 'utf8');
  assert.match(glContent, /trigger:\s*always_on/);
  assert.match(glContent, /# Global Engineering Standards/);
});

test('structural: templates have clean placeholders and no local machine paths or secrets', () => {
  const docsDir = path.join(ROOT, 'templates', 'docs');
  assert.equal(fs.existsSync(docsDir), true);

  const expectedTemplates = [
    'PROJECT_CONTEXT.md',
    'README.md',
    'api-contracts.md',
    'architecture.md',
    'data-model.md',
    'design-system.md',
    'plan.md'
  ];

  for (const t of expectedTemplates) {
    const tPath = path.join(docsDir, t);
    assert.equal(fs.existsSync(tPath), true, `Template harus ada: ${t}`);

    const content = fs.readFileSync(tPath, 'utf8');
    assert(content.length > 50, `Template ${t} tidak boleh kosong`);

    // Pastikan tidak ada hardcoded path mesin lokal pengembang
    assert.doesNotMatch(content, /[A-Z]:\\[Uu]sers\\/, `Template ${t} tidak boleh berisi path user lokal Windows`);
    assert.doesNotMatch(content, /\/home\/[a-z0-9_-]+\//, `Template ${t} tidak boleh berisi path home lokal Linux`);

    // Pastikan tidak ada credential/secret asli
    assert.doesNotMatch(content, /sk_live_[0-9a-zA-Z]{24}/);
    assert.doesNotMatch(content, /ghp_[0-9a-zA-Z]{36}/);
    assert.doesNotMatch(content, /-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----/);
  }
});

test('structural: root README.md documents all commands, options, and workflows', () => {
  const readmePath = path.join(ROOT, 'README.md');
  assert.equal(fs.existsSync(readmePath), true);

  const content = fs.readFileSync(readmePath, 'utf8');

  // Commands
  assert.match(content, /vibe-kit init/);
  assert.match(content, /vibe-kit update/);
  assert.match(content, /vibe-kit uninstall/);
  assert.match(content, /vibe-kit doctor/);

  // Profiles
  assert.match(content, /`base`/);
  assert.match(content, /`frontend`/);
  assert.match(content, /`backend`/);
  assert.match(content, /`fullstack`/);

  // Options
  assert.match(content, /--conflict/);
  assert.match(content, /--force/);
  assert.match(content, /--dry-run/);
  assert.match(content, /--yes/);

  // Scenarios
  assert.match(content, /Greenfield/);
  assert.match(content, /Ongoing/);
});
