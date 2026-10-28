import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseArgs,
  fromPosixRelative,
  isStrictlyInside,
  computeFileHash,
  createSafeBackup,
  applyFiles,
  init,
  update,
  uninstall,
  doctor,
  VERSION,
  MANIFEST,
  GLOBAL_MANIFEST
} from '../lib/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'bin', 'vibe-kit.js');

function run(args, cwd = root) {
  return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

function canCreateSymlinks() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-symlink-check-'));
  const testDir = path.join(tmp, 'dir');
  const testLink = path.join(tmp, 'link');
  try {
    fs.mkdirSync(testDir, { recursive: true });
    fs.symlinkSync(testDir, testLink, 'dir');
    return true;
  } catch {
    return false;
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

test('help prints the Vibe Kit commands', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /vibe-kit init/);
  assert.match(result.stdout, /vibe-kit doctor/);
  assert.match(result.stdout, /--conflict/);
});

test('version flag reports CLI version for --version and -v', () => {
  const resLong = run(['--version']);
  assert.equal(resLong.status, 0, resLong.stderr);
  assert.match(resLong.stdout, new RegExp(`@doni354/vibe-kit v${VERSION}`));

  const resShort = run(['-v']);
  assert.equal(resShort.status, 0, resShort.stderr);
  assert.match(resShort.stdout, new RegExp(`@doni354/vibe-kit v${VERSION}`));
});

test('doctor reports runtime and paths', () => {
  const result = run(['doctor']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Node\.js:/);
  assert.match(result.stdout, /Workspace skills:/);
  assert.match(result.stdout, /Global skills:/);
});

test('init dry-run previews assets without writing into target', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-'));
  try {
    const result = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--dry-run']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Dry-run selesai/);
    assert.equal(fs.existsSync(path.join(target, '.agents')), false);
    assert.equal(fs.existsSync(path.join(target, 'docs')), false);
    assert.equal(fs.existsSync(path.join(target, MANIFEST)), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('unknown command exits with an error', () => {
  const result = run(['not-a-command']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Command tidak dikenal/);
});

test('parseArgs: parses valid flags and supports --flag=value syntax', () => {
  const parsed = parseArgs([
    'init',
    '--target=D:/MyApp',
    '--scope=workspace',
    '--profile=frontend',
    '--conflict=replace',
    '--dry-run',
    '--yes'
  ]);

  assert.equal(parsed._[0], 'init');
  assert.equal(parsed.target, 'D:/MyApp');
  assert.equal(parsed.scope, 'workspace');
  assert.equal(parsed.profile, 'frontend');
  assert.equal(parsed.conflict, 'replace');
  assert.equal(parsed['dry-run'], true);
  assert.equal(parsed.yes, true);
});

test('parseArgs: throws on unknown flags', () => {
  assert.throws(
    () => parseArgs(['init', '--unknown-flag']),
    /Flag tidak dikenal/
  );
  assert.throws(
    () => parseArgs(['init', '-x']),
    /Flag tidak dikenal/
  );
});

test('parseArgs: throws on missing flag values', () => {
  assert.throws(
    () => parseArgs(['init', '--target']),
    /Flag "--target" membutuhkan nilai/
  );
  assert.throws(
    () => parseArgs(['init', '--profile', '--scope', 'workspace']),
    /Flag "--profile" membutuhkan nilai/
  );
});

test('parseArgs: throws on invalid scope, profile, or conflict values', () => {
  assert.throws(
    () => parseArgs(['init', '--scope', 'invalid']),
    /Scope tidak valid/
  );
  assert.throws(
    () => parseArgs(['init', '--profile', 'badprofile']),
    /Profil tidak valid/
  );
  assert.throws(
    () => parseArgs(['init', '--conflict', 'destroy']),
    /Kebijakan konflik tidak valid/
  );
});

test('workspace init creates assets with relative posix paths and sha256 hashes in manifest', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-init-'));
  try {
    const result = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const manifestPath = path.join(target, MANIFEST);
    assert.equal(fs.existsSync(manifestPath), true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.toolkit, '@doni354/vibe-kit');
    assert.equal(manifest.scope, 'workspace');
    assert.equal(manifest.profile, 'base');
    assert(manifest.paths.length > 0);

    // Pastikan seluruh path berupa relative posix path tanpa backslash
    for (const p of manifest.paths) {
      assert.equal(path.isAbsolute(p), false, `Path harus relatif: ${p}`);
      assert.equal(p.includes('\\'), false, `Path harus menggunakan separator slash: ${p}`);
      assert.equal(fs.existsSync(path.join(target, p)), true, `File harus ada di disk: ${p}`);

      const fileRecord = manifest.files[p];
      assert(fileRecord, `File record harus ada untuk ${p}`);
      assert.match(fileRecord.hash, /^sha256:[a-f0-9]{64}$/);
    }
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('manifest merging: installing another profile preserves previously installed files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-merge-'));
  try {
    // Install backend profile first
    const res1 = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'backend', '--yes']);
    assert.equal(res1.status, 0, res1.stderr);

    const manifest1 = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    const backendCount = manifest1.paths.length;
    assert(manifest1.paths.includes('.agents/skills/backend-feature/SKILL.md'));

    // Install frontend profile next
    const res2 = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'frontend', '--yes', '--conflict', 'keep']);
    assert.equal(res2.status, 0, res2.stderr);

    const manifest2 = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    // Backend files must still be tracked!
    assert(manifest2.paths.includes('.agents/skills/backend-feature/SKILL.md'), 'Backend skill harus tetap tercatat di manifest');
    assert(manifest2.paths.includes('.agents/skills/ui-implementation/SKILL.md'), 'Frontend skill harus tercatat di manifest');
    assert(manifest2.paths.length > backendCount, 'Total file harus bertambah setelah merge');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('pre-flight validation: aborts before writing anything if an asset source is missing', async () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-preflight-'));
  try {
    const fakeFiles = [
      { src: path.join(root, 'README.md'), dest: path.join(target, 'docs', 'README.md') },
      { src: path.join(root, 'non-existent-source-file.txt'), dest: path.join(target, 'docs', 'fake.txt') }
    ];

    await assert.rejects(
      async () => {
        await applyFiles(fakeFiles, { scope: 'workspace', profile: 'base' }, path.join(target, MANIFEST), target);
      },
      /Asset toolkit hilang atau tidak ditemukan/
    );

    // Pastikan tidak ada file yang ditulis sama sekali karena pre-flight gagal di awal
    assert.equal(fs.existsSync(path.join(target, 'docs')), false);
    assert.equal(fs.existsSync(path.join(target, MANIFEST)), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('uninstall: rejects path traversal and paths escaping target', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-traversal-'));
  const outsideFile = path.join(os.tmpdir(), 'vibe-kit-innocent-outside-file.txt');
  fs.writeFileSync(outsideFile, 'SAFE CONTENT');

  try {
    const maliciousManifest = {
      toolkit: '@doni354/vibe-kit',
      version: '0.1.0',
      scope: 'workspace',
      profile: 'base',
      paths: [
        '../../vibe-kit-innocent-outside-file.txt',
        '../non-existent.txt',
        outsideFile
      ],
      files: {}
    };

    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(maliciousManifest, null, 2));

    const result = run(['uninstall', '--target', target, '--scope', 'workspace', '--yes']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SECURITY WARNING/);

    // File di luar target harus tetap utuh dan tidak terhapus
    assert.equal(fs.existsSync(outsideFile), true, 'File di luar target tidak boleh disentuh');
  } finally {
    if (fs.existsSync(outsideFile)) fs.unlinkSync(outsideFile);
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('uninstall: protects user-modified files from deletion in non-interactive / --yes mode', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-protect-'));
  try {
    const initRes = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    assert.equal(initRes.status, 0, initRes.stderr);

    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    assert.equal(fs.existsSync(docPath), true);

    // Pengguna memodifikasi file dokumentasi
    fs.writeFileSync(docPath, '# MODIFIKASI PENGGUNA YANG SANGAT PENTING\nJangan dihapus!');

    // Jalankan uninstall dengan --yes
    const uninstRes = run(['uninstall', '--target', target, '--scope', 'workspace', '--yes']);
    assert.equal(uninstRes.status, 0, uninstRes.stderr);
    assert.match(uninstRes.stdout, /KEPT - USER MODIFIED/);

    // File yang diubah pengguna harus tetap ada!
    assert.equal(fs.existsSync(docPath), true, 'File hasil modifikasi user tidak boleh dihapus tanpa konfirmasi eksplisit');
    assert.match(fs.readFileSync(docPath, 'utf8'), /MODIFIKASI PENGGUNA/);

    // File yang tidak diubah (misalnya rules) harus sudah terhapus
    assert.equal(fs.existsSync(path.join(target, '.agents', 'rules', 'engineering-standards.md')), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('uninstall: --force removes user-modified files when explicitly requested', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-force-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    fs.writeFileSync(docPath, '# MODIFIED CONTENT');

    const uninstRes = run(['uninstall', '--target', target, '--scope', 'workspace', '--yes', '--force']);
    assert.equal(uninstRes.status, 0, uninstRes.stderr);
    assert.match(uninstRes.stdout, /REMOVED \(FORCE\)/);
    assert.equal(fs.existsSync(docPath), false, 'File modifikasi harus terhapus saat --force diberikan');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('uninstall: cleans empty parent directories without deleting target or user files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-clean-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);

    // Buat file milik user di dalam folder docs
    const userDoc = path.join(target, 'docs', 'my-custom-doc.md');
    fs.writeFileSync(userDoc, '# Custom Doc');

    const uninstRes = run(['uninstall', '--target', target, '--scope', 'workspace', '--yes']);
    assert.equal(uninstRes.status, 0, uninstRes.stderr);

    // Target harus tetap ada
    assert.equal(fs.existsSync(target), true);
    // File milik user dan folder docs harus tetap ada karena tidak kosong
    assert.equal(fs.existsSync(userDoc), true);
    assert.equal(fs.existsSync(path.join(target, 'docs')), true);

    // Folder .agents harus terhapus bersih karena isinya semua milik vibe-kit
    assert.equal(fs.existsSync(path.join(target, '.agents')), false);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('conflict handling: conflict=replace creates collision-safe backups', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-test-backup-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);

    const rulePath = path.join(target, '.agents', 'rules', 'engineering-standards.md');
    fs.writeFileSync(rulePath, '# Custom standards 1');

    // Re-init with replace
    const res1 = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes', '--conflict', 'replace']);
    assert.equal(res1.status, 0, res1.stderr);
    assert.match(res1.stdout, /\[BACKUP\]/);

    // Ubah lagi dan re-init with replace lagi
    fs.writeFileSync(rulePath, '# Custom standards 2');
    const res2 = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes', '--conflict', 'replace']);
    assert.equal(res2.status, 0, res2.stderr);

    // Pastikan file backup tercipta dan tidak saling menimpa
    const ruleDir = path.dirname(rulePath);
    const backups = fs.readdirSync(ruleDir).filter((f) => f.includes('.backup-'));
    assert(backups.length >= 2, `Harus ada minimal 2 backup: ${backups.join(', ')}`);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('isolated global scope: allows target override without touching user home', () => {
  const tempGlobal = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-global-sandbox-'));
  try {
    // Install dengan scope global mengarah ke direktori sementara
    const initRes = run(['init', '--target', tempGlobal, '--scope', 'global', '--profile', 'base', '--yes']);
    assert.equal(initRes.status, 0, initRes.stderr);

    const manifestPath = path.join(tempGlobal, GLOBAL_MANIFEST);
    assert.equal(fs.existsSync(manifestPath), true, 'Manifest global harus tercipta di target sandbox');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.scope, 'global');

    // Periksa rules global
    const ruleFile = path.join(tempGlobal, 'rules', 'vibe-kit-engineering-standards.md');
    assert.equal(fs.existsSync(ruleFile), true);

    // Uninstall sandbox
    const uninstRes = run(['uninstall', '--target', tempGlobal, '--scope', 'global', '--yes']);
    assert.equal(uninstRes.status, 0, uninstRes.stderr);
    assert.equal(fs.existsSync(manifestPath), false);
    assert.equal(fs.existsSync(ruleFile), false);
  } finally {
    fs.rmSync(tempGlobal, { recursive: true, force: true });
  }
});

test('target safety: rejects installing directly into toolkit repository or its parent', () => {
  const resInside = run(['init', '--target', root, '--scope', 'workspace', '--profile', 'base', '--yes']);
  assert.notEqual(resInside.status, 0);
  assert.match(resInside.stderr, /bukan folder toolkit atau parent-nya/);

  const parentDir = path.dirname(root);
  const resParent = run(['init', '--target', parentDir, '--scope', 'workspace', '--profile', 'base', '--yes']);
  assert.notEqual(resParent.status, 0);
  assert.match(resParent.stderr, /bukan folder toolkit atau parent-nya/);
});

// ==========================================
// FASE 2: UPDATE SEMANTICS & DOCTOR DIAGNOSTICS
// ==========================================

test('update: reports UNCHANGED when all files match current toolkit and modifies nothing', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-unchanged-'));
  try {
    const initRes = run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    assert.equal(initRes.status, 0, initRes.stderr);

    const updateRes = run(['update', '--target', target, '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /\[UNCHANGED\]/);
    assert.match(updateRes.stdout, /Selesai\. Workflow assets telah diperbarui/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: safely updates unmodified files when toolkit source is newer', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-newer-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const rulePath = path.join(target, '.agents', 'rules', 'engineering-standards.md');
    const manifestPath = path.join(target, MANIFEST);

    // Tulis versi lama pada file di disk dan catat hash versi lama di manifes
    // (mensimulasikan kondisi di mana file pengguna belum pernah diedit user,
    //  tetapi toolkit saat ini memiliki konten yang lebih baru)
    const oldContent = '# Old engineering standards from previous version\n';
    fs.writeFileSync(rulePath, oldContent);
    const oldHash = computeFileHash(rulePath);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.files['.agents/rules/engineering-standards.md'].hash = oldHash;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Jalankan update
    const updateRes = run(['update', '--target', target, '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /\[UPDATE\] \.agents\/rules\/engineering-standards\.md/);

    // File harus terupdate ke versi toolkit terbaru
    const newContent = fs.readFileSync(rulePath, 'utf8');
    assert.notEqual(newContent, oldContent);
    assert.match(newContent, /# .*Engineering Standards/i);

    // Hash di manifes harus terupdate ke hash baru
    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(updatedManifest.files['.agents/rules/engineering-standards.md'].hash, computeFileHash(rulePath));
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: protects user-modified files from being overwritten without explicit permission', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-mod-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    const userDocContent = '# CUSTOM USER DOCUMENTATION\nDo not overwrite my work!';
    fs.writeFileSync(docPath, userDocContent);

    // Jalankan update default dengan --yes (kebijakan non-interaktif harus default ke keep)
    const updateRes = run(['update', '--target', target, '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /\[KEPT - USER MODIFIED\] docs\/ai-workflow\/PROJECT_CONTEXT\.md/);

    // Konten pengguna harus tetap utuh
    assert.equal(fs.readFileSync(docPath, 'utf8'), userDocContent);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: conflict=replace backs up and updates user-modified files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-replace-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    fs.writeFileSync(docPath, '# MY SPECIAL CONTEXT');

    const updateRes = run(['update', '--target', target, '--yes', '--conflict', 'replace']);
    assert.equal(updateRes.status, 0, updateRes.stderr);
    assert.match(updateRes.stdout, /\[BACKUP\]/);
    assert.match(updateRes.stdout, /\[REPLACED\] docs\/ai-workflow\/PROJECT_CONTEXT\.md/);

    // File harus terupdate kembali ke template toolkit
    assert.match(fs.readFileSync(docPath, 'utf8'), /# Project Context/i);

    // File backup harus tercipta di folder yang sama
    const dir = path.dirname(docPath);
    const backups = fs.readdirSync(dir).filter((f) => f.includes('PROJECT_CONTEXT.md.backup-'));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(dir, backups[0]), 'utf8'), '# MY SPECIAL CONTEXT');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: does not silently recreate user-deleted files unless --force is specified', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-del-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const readmePath = path.join(target, 'docs', 'ai-workflow', 'README.md');
    assert.equal(fs.existsSync(readmePath), true);

    // Pengguna sengaja menghapus file ini
    fs.unlinkSync(readmePath);

    // Update normal (tanpa --force) tidak boleh membuat ulang file secara diam-diam
    const resNoForce = run(['update', '--target', target, '--yes']);
    assert.equal(resNoForce.status, 0, resNoForce.stderr);
    assert.match(resNoForce.stdout, /\[SKIPPED - USER DELETED\] docs\/ai-workflow\/README\.md/);
    assert.equal(fs.existsSync(readmePath), false, 'File yang dihapus user tidak boleh dibuat ulang tanpa --force');

    // Update dengan --force membuat ulang file
    const resForce = run(['update', '--target', target, '--yes', '--force']);
    assert.equal(resForce.status, 0, resForce.stderr);
    assert.match(resForce.stdout, /\[RECREATE\] docs\/ai-workflow\/README\.md/);
    assert.equal(fs.existsSync(readmePath), true, 'File harus dibuat ulang saat --force diberikan');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: dry-run previews updates without writing files or updating manifest', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-dry-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    fs.writeFileSync(docPath, '# MODIFIED');

    const manifestBefore = fs.readFileSync(path.join(target, MANIFEST), 'utf8');

    const dryRes = run(['update', '--target', target, '--dry-run']);
    assert.equal(dryRes.status, 0, dryRes.stderr);
    assert.match(dryRes.stdout, /--- \[DRY-RUN PREVIEW UPDATE\] ---/);
    assert.match(dryRes.stdout, /Dry-run selesai\. Tidak ada file yang diubah/);

    const manifestAfter = fs.readFileSync(path.join(target, MANIFEST), 'utf8');
    assert.equal(manifestBefore, manifestAfter, 'Manifes tidak boleh berubah saat dry-run');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: fails safely on corrupt manifest without damaging workspace files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-corrupt-'));
  try {
    // Buat manifes yang rusak / bukan JSON valid
    fs.writeFileSync(path.join(target, MANIFEST), '{ INVALID JSON CONTENT');
    const dummyFile = path.join(target, 'my-precious-file.txt');
    fs.writeFileSync(dummyFile, 'IMPORTANT USER DATA');

    const updateRes = run(['update', '--target', target, '--yes']);
    assert.notEqual(updateRes.status, 0);
    assert.match(updateRes.stderr, /Manifest korup atau tidak valid/);

    // File kerja pengguna harus tetap utuh
    assert.equal(fs.readFileSync(dummyFile, 'utf8'), 'IMPORTANT USER DATA');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: migrates legacy manifest format safely', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-legacy-'));
  try {
    const ruleDir = path.join(target, '.agents', 'rules');
    fs.mkdirSync(ruleDir, { recursive: true });
    const rulePath = path.join(ruleDir, 'engineering-standards.md');
    fs.writeFileSync(rulePath, '# Legacy engineering standards\n');

    // Format manifes versi lama (hanya berisi paths tanpa hash map files)
    const legacyManifest = {
      toolkit: '@doni354/vibe-kit',
      version: '0.0.1',
      scope: 'workspace',
      profile: 'base',
      paths: ['.agents/rules/engineering-standards.md']
    };
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(legacyManifest, null, 2));

    const updateRes = run(['update', '--target', target, '--yes']);
    assert.equal(updateRes.status, 0, updateRes.stderr);

    const migratedManifest = JSON.parse(fs.readFileSync(path.join(target, MANIFEST), 'utf8'));
    assert.equal(migratedManifest.version, VERSION);
    assert(migratedManifest.files, 'Manifes harus dimigrasi dengan menambahkan properti files');
    assert(migratedManifest.files['.agents/rules/engineering-standards.md']);
    assert.match(migratedManifest.files['.agents/rules/engineering-standards.md'].hash, /^sha256:/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('doctor: reports PASS on healthy workspace with intact files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-doc-pass-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);

    const docRes = run(['doctor', '--target', target]);
    assert.equal(docRes.status, 0, docRes.stderr);
    assert.match(docRes.stdout, /\[PASS\] Versi Node\.js/);
    assert.match(docRes.stdout, /\[PASS\] Struktur dan file asset sumber toolkit lengkap/);
    assert.match(docRes.stdout, /\[PASS\] Direktori target memiliki izin baca dan tulis/);
    assert.match(docRes.stdout, /\[PASS\] Format manifes valid/);
    assert.match(docRes.stdout, /\[PASS\] Semua file terpasang .* utuh/);
    assert.match(docRes.stdout, /Status Diagnostik: PASS/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('doctor: reports WARN when files are modified by user or missing', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-doc-warn-'));
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);

    // Ubah satu file dan hapus satu file
    const docPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    fs.writeFileSync(docPath, '# USER MODIFIED CONTEXT');

    const readmePath = path.join(target, 'docs', 'ai-workflow', 'README.md');
    fs.unlinkSync(readmePath);

    const docRes = run(['doctor', '--target', target]);
    assert.equal(docRes.status, 0, docRes.stderr);
    assert.match(docRes.stdout, /\[WARN\] 1 file yang dilacak hilang dari disk/);
    assert.match(docRes.stdout, /\[WARN\] 1 file telah dimodifikasi oleh pengguna/);
    assert.match(docRes.stdout, /Status Diagnostik: WARN/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('doctor: reports FAIL with non-zero exit code when manifest is corrupt or has path traversal', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-doc-fail-'));
  try {
    // Manifes dengan syntax rusak
    fs.writeFileSync(path.join(target, MANIFEST), '{ NOT VALID JSON');

    const docRes = run(['doctor', '--target', target]);
    assert.notEqual(docRes.status, 0);
    assert.match(docRes.stdout, /\[FAIL\] File manifes korup atau bukan JSON valid/);
    assert.match(docRes.stdout, /Status Diagnostik: FAIL/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('doctor: reports FAIL when manifest contains unsafe escaping paths', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-doc-unsafe-'));
  try {
    const unsafeManifest = {
      toolkit: '@doni354/vibe-kit',
      version: '0.1.0',
      scope: 'workspace',
      profile: 'base',
      paths: ['../../some-system-file.txt'],
      files: {}
    };
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify(unsafeManifest, null, 2));

    const docRes = run(['doctor', '--target', target]);
    assert.notEqual(docRes.status, 0);
    assert.match(docRes.stdout, /\[FAIL\] Ditemukan path yang tidak aman/);
    assert.match(docRes.stdout, /Status Diagnostik: FAIL/);
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: mid-process failure triggers rollback and preserves previous file state', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-kit-update-rollback-'));
  let roFile = null;
  try {
    run(['init', '--target', target, '--scope', 'workspace', '--profile', 'base', '--yes']);
    const manifestPath = path.join(target, MANIFEST);
    const manifestBefore = fs.readFileSync(manifestPath, 'utf8');

    // Buat file pertama memiliki versi berbeda untuk memicu update
    const rulePath = path.join(target, '.agents', 'rules', 'engineering-standards.md');
    const oldRuleContent = '# Rule before update\n';
    fs.writeFileSync(rulePath, oldRuleContent);
    const manifestObj = JSON.parse(manifestBefore);
    manifestObj.files['.agents/rules/engineering-standards.md'].hash = computeFileHash(rulePath);
    fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2));

    // Jadikan file terakhir (docs/ai-workflow/plan.md) termodifikasi dan berstatus read-only agar copyFileSync gagal dengan EPERM saat overwrite
    roFile = path.join(target, 'docs', 'ai-workflow', 'plan.md');
    fs.writeFileSync(roFile, '# Custom plan to trigger replace overwrite\n');
    fs.chmodSync(roFile, 0o444);

    // Jalankan update with replace agar mencoba menulis ke roFile
    const updateRes = run(['update', '--target', target, '--yes', '--conflict', 'replace']);
    assert.notEqual(updateRes.status, 0);
    assert.match(updateRes.stderr, /Update gagal/);
    assert.match(updateRes.stderr, /Perubahan telah di-rollback/);

    // Manifes harus tetap seperti sebelum update
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), JSON.stringify(manifestObj, null, 2));
  } finally {
    if (roFile && fs.existsSync(roFile)) {
      try { fs.chmodSync(roFile, 0o666); } catch {}
    }
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: deterministic failure via filesystem abstraction restores all overwritten files and cleans rollback snapshots', async () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-det-rollback-'));
  try {
    await init({ target, scope: 'workspace', profile: 'base', yes: true });
    const manifestPath = path.join(target, MANIFEST);
    const manifestBefore = fs.readFileSync(manifestPath, 'utf8');

    // 1. Siapkan file untuk tipe UPDATE (file toolkit diperbarui, file lokal belum diedit)
    const rulePath = path.join(target, '.agents', 'rules', 'engineering-standards.md');
    const oldRuleContent = '# Rule before update\n';
    fs.writeFileSync(rulePath, oldRuleContent);
    const mObj = JSON.parse(manifestBefore);
    mObj.files['.agents/rules/engineering-standards.md'].hash = computeFileHash(rulePath);
    fs.writeFileSync(manifestPath, JSON.stringify(mObj, null, 2));

    // 2. Siapkan file untuk tipe USER_MODIFIED_CONFLICT (file dimodifikasi user, akan di-replace)
    const contextPath = path.join(target, 'docs', 'ai-workflow', 'PROJECT_CONTEXT.md');
    const userContextContent = '# Custom User Context to Replace\n';
    fs.writeFileSync(contextPath, userContextContent);

    // 3. Siapkan file ketiga yang juga dimodifikasi user, yang sengaja digagalkan saat penulisan
    const planPath = path.join(target, 'docs', 'ai-workflow', 'plan.md');
    const userPlanContent = '# Custom User Plan to Fail\n';
    fs.writeFileSync(planPath, userPlanContent);

    // Dependency injection: mock fs yang menggagalkan copyFileSync pada planPath
    // tapi tetap mengizinkan restorasi rollback snapshot (src mengandung .vibe-rollback-)
    const faultFs = {
      ...fs,
      copyFileSync(src, dest, flags) {
        if (!src.includes('.vibe-rollback-') && path.resolve(dest) === path.resolve(planPath)) {
          throw new Error('Deterministic injected write failure on plan.md');
        }
        return fs.copyFileSync(src, dest, flags);
      }
    };

    let errorThrown = null;
    try {
      await update({ target, yes: true, conflict: 'replace', fs: faultFs });
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown, 'Update harus melempar error kegagalan');
    assert.match(errorThrown.message, /Update gagal/);
    assert.match(errorThrown.message, /Perubahan telah di-rollback/);

    // Verifikasi pemulihan:
    // a. File UPDATE (engineering-standards.md) harus kembali ke versi aslinya
    assert.equal(fs.readFileSync(rulePath, 'utf8'), oldRuleContent);

    // b. File USER_MODIFIED_CONFLICT (PROJECT_CONTEXT.md) harus kembali ke konten user
    assert.equal(fs.readFileSync(contextPath, 'utf8'), userContextContent);

    // c. File yang gagal ditulis (plan.md) tetap utuh
    assert.equal(fs.readFileSync(planPath, 'utf8'), userPlanContent);

    // d. Backup pengguna (.backup-*) untuk PROJECT_CONTEXT.md TIDAK dihapus
    const userBackups = fs.readdirSync(path.join(target, 'docs', 'ai-workflow')).filter(f => f.includes('PROJECT_CONTEXT.md.backup-'));
    assert.equal(userBackups.length, 1, 'Backup pengguna harus tetap dipertahankan');

    // e. Snapshot rollback sementara (.vibe-rollback-*) harus dibersihkan secara tuntas
    const rulesFiles = fs.readdirSync(path.join(target, '.agents', 'rules'));
    const docFiles = fs.readdirSync(path.join(target, 'docs', 'ai-workflow'));
    const leftoverRollback = [...rulesFiles, ...docFiles].filter(f => f.includes('.vibe-rollback-'));
    assert.equal(leftoverRollback.length, 0, 'Semua snapshot sementara rollback harus bersih');

    // f. Manifes harus dipulihkan seperti semula
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), JSON.stringify(mObj, null, 2));
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('update: deterministic failure during manifest write triggers complete rollback', async () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-det-manifest-'));
  try {
    await init({ target, scope: 'workspace', profile: 'base', yes: true });
    const manifestPath = path.join(target, MANIFEST);
    const manifestBefore = fs.readFileSync(manifestPath, 'utf8');

    const rulePath = path.join(target, '.agents', 'rules', 'engineering-standards.md');
    const oldRuleContent = '# Rule before update\n';
    fs.writeFileSync(rulePath, oldRuleContent);
    const mObj = JSON.parse(manifestBefore);
    mObj.files['.agents/rules/engineering-standards.md'].hash = computeFileHash(rulePath);
    fs.writeFileSync(manifestPath, JSON.stringify(mObj, null, 2));

    const faultFs = {
      ...fs,
      writeFileSync(filePath, data, enc) {
        if (path.resolve(filePath) === path.resolve(manifestPath) && typeof data === 'string' && data.includes(mObj.toolkit)) {
          throw new Error('Deterministic injected fault: simulated disk full on manifest write');
        }
        return fs.writeFileSync(filePath, data, enc);
      }
    };

    let errorThrown = null;
    try {
      await update({ target, yes: true, fs: faultFs });
    } catch (err) {
      errorThrown = err;
    }

    assert(errorThrown, 'Update harus gagal ketika penulisan manifes gagal');
    assert.match(errorThrown.message, /Update gagal/);
    assert.match(errorThrown.message, /Perubahan telah di-rollback/);

    // File yang sempat di-update harus dipulihkan
    assert.equal(fs.readFileSync(rulePath, 'utf8'), oldRuleContent);

    // Manifes harus tetap seperti semula
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), JSON.stringify(mObj, null, 2));
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test('symlink escape: init rejects directory symlink (.agents) pointing outside target and writes 0 files outside', async (t) => {
  if (!canCreateSymlinks()) {
    t.skip('Platform atau user environment tidak mengizinkan pembuatan symbolic link (perlu Windows Developer Mode atau admin privileges)');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-symlink-init-'));
  const outside = path.join(tmp, 'outside');
  const target = path.join(tmp, 'target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(target, { recursive: true });

  try {
    fs.symlinkSync(outside, path.join(target, '.agents'), 'dir');

    let initError = null;
    try {
      await init({ target, yes: true });
    } catch (err) {
      initError = err;
    }

    assert(initError, 'init harus menolak eksekusi ketika .agents mengarah ke luar target');
    assert.match(initError.message, /Path tujuan tidak aman di luar folder target/);

    // Pastikan tidak ada file yang ditulis di luar target
    assert.equal(fs.readdirSync(outside).length, 0, 'Direktori eksternal tidak boleh kemasukan file apa pun');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('symlink escape: init rejects nested directory symlink (.agents/skills) pointing outside target', async (t) => {
  if (!canCreateSymlinks()) {
    t.skip('Platform atau user environment tidak mengizinkan pembuatan symbolic link');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-nested-symlink-'));
  const outside = path.join(tmp, 'outside');
  const target = path.join(tmp, 'target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(path.join(target, '.agents'), { recursive: true });

  try {
    fs.symlinkSync(outside, path.join(target, '.agents', 'skills'), 'dir');

    let initError = null;
    try {
      await init({ target, yes: true });
    } catch (err) {
      initError = err;
    }

    assert(initError, 'init harus menolak nested symlink escape');
    assert.match(initError.message, /Path tujuan tidak aman di luar folder target/);
    assert.equal(fs.readdirSync(outside).length, 0, 'Direktori eksternal tidak boleh kemasukan file apa pun');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('symlink escape: update rejects directory symlink pointing outside target and writes 0 files outside', async (t) => {
  if (!canCreateSymlinks()) {
    t.skip('Platform atau user environment tidak mengizinkan pembuatan symbolic link');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-symlink-update-'));
  const outside = path.join(tmp, 'outside');
  const target = path.join(tmp, 'target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(target, { recursive: true });

  try {
    fs.symlinkSync(outside, path.join(target, '.agents'), 'dir');
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify({
      toolkit: '@doni354/vibe-kit',
      version: '0.1.0',
      scope: 'workspace',
      profile: 'base',
      paths: ['.agents/rules/engineering-standards.md'],
      files: {}
    }));

    let updateError = null;
    try {
      await update({ target, yes: true });
    } catch (err) {
      updateError = err;
    }

    assert(updateError, 'update harus menolak symlink escape');
    assert.match(updateError.message, /Path tujuan tidak aman di luar target/);
    assert.equal(fs.readdirSync(outside).length, 0, 'Direktori eksternal tidak boleh kemasukan file apa pun');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('symlink escape: uninstall does not delete or touch files outside target even if tracked in manifest', async (t) => {
  if (!canCreateSymlinks()) {
    t.skip('Platform atau user environment tidak mengizinkan pembuatan symbolic link');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-symlink-uninstall-'));
  const outside = path.join(tmp, 'outside');
  const target = path.join(tmp, 'target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(target, { recursive: true });

  const outsideSecret = path.join(outside, 'critical-data.txt');
  fs.writeFileSync(outsideSecret, 'IMPORTANT USER DATA');

  try {
    fs.symlinkSync(outside, path.join(target, '.agents'), 'dir');
    fs.writeFileSync(path.join(target, MANIFEST), JSON.stringify({
      toolkit: '@doni354/vibe-kit',
      version: '0.1.0',
      scope: 'workspace',
      profile: 'base',
      paths: ['.agents/critical-data.txt'],
      files: {}
    }));

    await uninstall({ target, yes: true, force: true });

    // File di outside tidak boleh dihapus
    assert.equal(fs.existsSync(outsideSecret), true, 'File di luar target tidak boleh dihapus');
    assert.equal(fs.readFileSync(outsideSecret, 'utf8'), 'IMPORTANT USER DATA');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('symlink escape: doctor detects symlinked .agents directory escaping target and reports FAIL', async (t) => {
  if (!canCreateSymlinks()) {
    t.skip('Platform atau user environment tidak mengizinkan pembuatan symbolic link');
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-symlink-doctor-'));
  const outside = path.join(tmp, 'outside');
  const target = path.join(tmp, 'target');
  fs.mkdirSync(outside, { recursive: true });
  fs.mkdirSync(target, { recursive: true });

  try {
    fs.symlinkSync(outside, path.join(target, '.agents'), 'dir');

    const originalExitCode = process.exitCode;
    process.exitCode = 0;

    await doctor({ target });

    assert.equal(process.exitCode, 1, 'doctor harus mengatur exitCode non-zero (1) ketika menemukan symlink escape');
    process.exitCode = originalExitCode;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});


