import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  resolvePacks,
  resolvePackFiles,
  previewResolution,
  mapLegacyProfileToPacks
} from './pack-resolver.js';

import {
  CONFIG_FILE,
  loadProjectConfig,
  saveProjectConfig,
  refreshProjectConfig
} from './config.js';
import { detectProject } from './detector.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
export const VERSION = PKG.version;

export const PROFILES = {
  base: ['project-onboarding', 'documentation', 'verification'],
  frontend: ['project-onboarding', 'documentation', 'verification', 'ui-implementation'],
  backend: ['project-onboarding', 'documentation', 'verification', 'backend-feature'],
  fullstack: ['project-onboarding', 'documentation', 'verification', 'ui-implementation', 'backend-feature', 'fullstack-integration']
};

export const MANIFEST = '.vibe-kit-manifest.json';
export const GLOBAL_MANIFEST = 'vibe-kit-global-manifest.json';
export { CONFIG_FILE };

export function getFs(opts) {
  return opts?.fs || fs;
}

export const exists = (p, io = fs) => io.existsSync(p);
export const ensureDir = (p, io = fs) => io.mkdirSync(p, { recursive: true });

export function stripExtendedPrefix(p) {
  if (typeof p !== 'string') return p;
  if (p.startsWith('\\\\?\\UNC\\')) return '\\\\' + p.slice(8);
  if (p.startsWith('\\\\?\\')) return p.slice(4);
  return p;
}

export function normalizeForCompare(p) {
  const stripped = stripExtendedPrefix(p);
  const resolved = path.resolve(stripped);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function isPathEqual(p1, p2) {
  return normalizeForCompare(p1) === normalizeForCompare(p2);
}

export function isTextualInside(childPath, parentPath) {
  const normChild = normalizeForCompare(childPath);
  const normParent = normalizeForCompare(parentPath);
  if (normChild === normParent) return true;
  const rel = path.relative(normParent, normChild);
  return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
}

export function pathOrLinkExists(p, io = fs) {
  try {
    io.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function resolveRealPath(p, io = fs, seen = new Set()) {
  const resolved = stripExtendedPrefix(path.resolve(p));
  const compareKey = normalizeForCompare(resolved);
  if (seen.has(compareKey)) return resolved;
  seen.add(compareKey);

  try {
    const st = io.lstatSync(resolved);
    if (st.isSymbolicLink()) {
      const linkTarget = io.readlinkSync(resolved);
      const targetAbs = path.isAbsolute(linkTarget) ? linkTarget : path.resolve(path.dirname(resolved), linkTarget);
      return resolveRealPath(stripExtendedPrefix(targetAbs), io, seen);
    }
    if (io.existsSync(resolved)) {
      return stripExtendedPrefix(io.realpathSync(resolved));
    }
  } catch {}

  let current = resolved;
  const segments = [];
  while (true) {
    const parent = path.dirname(current);
    if (parent === current) return resolved;
    segments.unshift(path.basename(current));
    current = parent;
    if (pathOrLinkExists(current, io)) {
      const realAncestor = resolveRealPath(current, io, seen);
      return stripExtendedPrefix(path.resolve(realAncestor, ...segments));
    }
  }
}

export function isPathInside(childPath, parentPath, io = fs) {
  if (!isTextualInside(childPath, parentPath)) {
    return false;
  }
  const realChild = resolveRealPath(childPath, io);
  const realParent = resolveRealPath(parentPath, io);
  return isTextualInside(realChild, realParent);
}

export function isStrictlyInside(childPath, parentPath, io = fs) {
  if (isPathEqual(childPath, parentPath)) {
    return false;
  }
  const realChild = resolveRealPath(childPath, io);
  const realParent = resolveRealPath(parentPath, io);
  if (isPathEqual(realChild, realParent)) {
    return false;
  }
  return isPathInside(childPath, parentPath, io);
}

export function toPosixRelative(absolutePath, basePath) {
  const rel = path.relative(basePath, absolutePath);
  return rel.split(path.sep).join('/');
}

export function fromPosixRelative(relativePath, basePath, io = fs) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Relative path tidak valid.');
  }
  if (path.isAbsolute(relativePath) || relativePath.startsWith('/') || relativePath.startsWith('\\')) {
    const resolved = path.resolve(relativePath);
    if (!isStrictlyInside(resolved, basePath, io)) {
      throw new Error(`Path tidak aman (berada di luar target): ${relativePath}`);
    }
    return resolved;
  }
  const parts = relativePath.split(/[/\\]/);
  if (parts.includes('..')) {
    throw new Error(`Path traversal terdeteksi: ${relativePath}`);
  }
  const resolved = path.resolve(basePath, ...parts);
  if (!isStrictlyInside(resolved, basePath, io)) {
    throw new Error(`Path tujuan berada di luar folder target: ${relativePath}`);
  }
  return resolved;
}

export function computeFileHash(filePath, io = fs) {
  if (!io.existsSync(filePath)) return null;
  const buf = io.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

export function createSafeBackup(filePath, io = fs) {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  let backupPath = `${filePath}.backup-${dateStr}`;
  let counter = 1;
  while (io.existsSync(backupPath)) {
    backupPath = `${filePath}.backup-${dateStr}-${counter++}`;
  }
  io.copyFileSync(filePath, backupPath, fs.constants.COPYFILE_EXCL);
  return backupPath;
}

export function cleanEmptyParentDirs(filePath, targetDir, io = fs) {
  let dir = path.dirname(filePath);
  while (isStrictlyInside(dir, targetDir, io)) {
    try {
      const st = io.lstatSync(dir);
      if (st.isSymbolicLink()) {
        break;
      }
      const entries = io.readdirSync(dir);
      if (entries.length === 0) {
        io.rmdirSync(dir);
        dir = path.dirname(dir);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

const ALLOWED_FLAGS = new Set([
  'help', 'h',
  'version', 'v',
  'dry-run',
  'yes',
  'force',
  'target',
  'scope',
  'profile',
  'pack',
  'conflict',
  'save',
  'json',
  'enable',
  'disable',
  'reset',
  'show'
]);

const STRING_FLAGS = new Set(['target', 'scope', 'profile', 'pack', 'conflict', 'enable', 'disable']);
const BOOLEAN_FLAGS = new Set(['help', 'h', 'version', 'v', 'dry-run', 'yes', 'force', 'save', 'json', 'reset', 'show']);

export function parseArgs(args) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') {
      out._.push(...args.slice(i + 1));
      break;
    }

    if (a.startsWith('--')) {
      const eqIdx = a.indexOf('=');
      let flagName = eqIdx !== -1 ? a.slice(2, eqIdx) : a.slice(2);
      let inlineValue = eqIdx !== -1 ? a.slice(eqIdx + 1) : null;

      if (!ALLOWED_FLAGS.has(flagName)) {
        throw new Error(`Flag tidak dikenal: "${a}". Jalankan vibe-kit --help untuk bantuan.`);
      }

      if (BOOLEAN_FLAGS.has(flagName)) {
        if (inlineValue !== null) {
          throw new Error(`Flag "--${flagName}" tidak menerima nilai.`);
        }
        out[flagName] = true;
      } else if (STRING_FLAGS.has(flagName)) {
        let val = inlineValue;
        if (val === null) {
          if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
            throw new Error(`Flag "--${flagName}" membutuhkan nilai.`);
          }
          val = args[++i];
        }
        if (!val || val.trim() === '') {
          throw new Error(`Flag "--${flagName}" membutuhkan nilai.`);
        }
        out[flagName] = val;
      }
    } else if (a.startsWith('-') && a.length > 1) {
      const short = a.slice(1);
      if (short === 'h') out.help = true;
      else if (short === 'v') out.version = true;
      else throw new Error(`Flag tidak dikenal: "${a}". Jalankan vibe-kit --help untuk bantuan.`);
    } else {
      out._.push(a);
    }
  }

  if (out.h) out.help = true;
  if (out.v) out.version = true;

  if (out.scope && !['workspace', 'global'].includes(out.scope)) {
    throw new Error(`Scope tidak valid: "${out.scope}". Pilihan: workspace, global.`);
  }
  if (out.profile && !PROFILES[out.profile]) {
    throw new Error(`Profil tidak valid: "${out.profile}". Pilihan: base, frontend, backend, fullstack.`);
  }
  if (out.conflict && !['keep', 'replace', 'skip'].includes(out.conflict)) {
    throw new Error(`Kebijakan konflik tidak valid: "${out.conflict}". Pilihan: keep, replace, skip.`);
  }

  return out;
}

export async function ask(q, fallback = '') {
  const rl = readline.createInterface({ input, output });
  try {
    const a = (await rl.question(`${q}${fallback ? ` [${fallback}]` : ''}: `)).trim();
    return a || fallback;
  } finally {
    rl.close();
  }
}

export async function choose(q, items, fallback) {
  console.log(`\n${q}`);
  items.forEach((x, i) => console.log(`  ${i + 1}. ${x.label}${x.value === fallback ? ' (default)' : ''}`));
  const fallbackIndex = items.findIndex((x) => x.value === fallback);
  const n = Number(await ask('Pilih nomor', String(fallbackIndex !== -1 ? fallbackIndex + 1 : 1)));
  if (!Number.isInteger(n) || !items[n - 1]) throw new Error('Pilihan tidak valid.');
  return items[n - 1].value;
}

export async function confirm(q, defaultYes = false) {
  const a = (await ask(`${q} ${defaultYes ? '[Y/n]' : '[y/N]'}`, defaultYes ? 'y' : 'n')).toLowerCase();
  return defaultYes ? !['n', 'no'].includes(a) : ['y', 'yes'].includes(a);
}

export function sourceFiles(scope, target, profile) {
  if (!PROFILES[profile]) throw new Error(`Profil tidak dikenal: ${profile}`);
  const files = [];
  const skillRoot = scope === 'workspace' ? path.join(target, '.agents', 'skills') : path.join(target, 'skills');

  for (const skill of PROFILES[profile]) {
    const dir = path.join(ROOT, 'skills', skill);
    if (!exists(dir)) throw new Error(`Skill tidak ditemukan: ${dir}`);
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      if (f.isFile()) {
        files.push({
          src: path.join(dir, f.name),
          dest: path.join(skillRoot, skill, f.name)
        });
      }
    }
  }

  if (scope === 'workspace') {
    files.push({
      src: path.join(ROOT, 'rules', 'workspace', 'engineering-standards.md'),
      dest: path.join(target, '.agents', 'rules', 'engineering-standards.md')
    });
    const docs = path.join(ROOT, 'templates', 'docs');
    if (exists(docs)) {
      for (const f of fs.readdirSync(docs, { withFileTypes: true })) {
        if (f.isFile()) {
          files.push({
            src: path.join(docs, f.name),
            dest: path.join(target, 'docs', 'ai-workflow', f.name)
          });
        }
      }
    }
  } else {
    files.push({
      src: path.join(ROOT, 'rules', 'global', 'engineering-standards.md'),
      dest: path.join(target, 'rules', 'vibe-kit-engineering-standards.md')
    });
  }

  return files;
}

export async function applyFiles(files, opts, manifestPath, target) {
  const io = getFs(opts);

  if (!io.existsSync(target) || !io.statSync(target).isDirectory()) {
    throw new Error(`Folder target tidak ditemukan atau bukan direktori: ${target}`);
  }

  for (const f of files) {
    if (!io.existsSync(f.src)) {
      throw new Error(`Asset toolkit hilang atau tidak ditemukan: ${f.src}. Instalasi dibatalkan sebelum menulis file apa pun.`);
    }
    if (!isStrictlyInside(f.dest, target, io)) {
      throw new Error(`Path tujuan tidak aman di luar folder target: ${f.dest}. Instalasi dibatalkan.`);
    }
  }

  if (opts['dry-run']) {
    for (const f of files) {
      const relDest = toPosixRelative(f.dest, target);
      if (io.existsSync(f.dest)) {
        console.log(`[CONFLICT — akan ditanya/kebijakan] ${relDest}`);
      } else {
        console.log(`[CREATE] ${relDest}`);
      }
    }
    console.log('\nDry-run selesai. Tidak ada file atau direktori yang ditulis.');
    return;
  }

  const initialManifestContent = io.existsSync(manifestPath) ? io.readFileSync(manifestPath, 'utf8') : null;
  const journal = [];
  const recordedEntries = {};

  try {
    for (const f of files) {
      const relDest = toPosixRelative(f.dest, target);
      if (io.existsSync(f.dest)) {
        let choice = opts.conflict;
        if (!choice) {
          if (opts.yes || !input.isTTY) {
            choice = 'keep';
            console.log(`[CONFLICT - KEPT (DEFAULT)] ${relDest}`);
          } else {
            choice = await choose(`File sudah ada:\n${relDest}`, [
              { label: 'Pertahankan file yang ada', value: 'keep' },
              { label: 'Backup lalu ganti dengan versi toolkit', value: 'replace' },
              { label: 'Skip file ini', value: 'skip' }
            ], 'keep');
          }
        }

        if (choice === 'skip') {
          console.log(`[SKIPPED] ${relDest}`);
          continue;
        }

        if (choice === 'keep') {
          console.log(`[KEPT] ${relDest}`);
          recordedEntries[relDest] = computeFileHash(f.dest, io);
          continue;
        }

        if (choice === 'replace') {
          const userBackup = createSafeBackup(f.dest, io);
          const rollbackBackupPath = `${f.dest}.vibe-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          io.copyFileSync(f.dest, rollbackBackupPath);
          journal.push({ type: 'OVERWRITE', path: f.dest, rollbackBackupPath, userBackupPath: userBackup });
          console.log(`[BACKUP] ${userBackup}`);
        }
      } else {
        journal.push({ type: 'CREATE', path: f.dest });
      }

      ensureDir(path.dirname(f.dest), io);
      io.copyFileSync(f.src, f.dest);

      const hash = computeFileHash(f.dest, io);
      recordedEntries[relDest] = hash;
      console.log(`[INSTALLED] ${relDest}`);
    }
    let oldManifest = null;
    if (initialManifestContent !== null) {
      try {
        oldManifest = JSON.parse(initialManifestContent);
      } catch {
        createSafeBackup(manifestPath, io);
      }
    }

    const mergedFiles = oldManifest?.files ? { ...oldManifest.files } : {};
    const mergedPathsSet = new Set();

    if (oldManifest?.paths && Array.isArray(oldManifest.paths)) {
      for (const p of oldManifest.paths) {
        if (typeof p === 'string') {
          if (path.isAbsolute(p)) {
            if (isStrictlyInside(p, target, io)) {
              mergedPathsSet.add(toPosixRelative(p, target));
            }
          } else {
            mergedPathsSet.add(p.split(/[/\\]/).join('/'));
          }
        }
      }
    }

    const now = new Date().toISOString();
    for (const [relPath, hash] of Object.entries(recordedEntries)) {
      mergedPathsSet.add(relPath);
      mergedFiles[relPath] = {
        hash,
        installedAt: mergedFiles[relPath]?.installedAt || now,
        updatedAt: now
      };
    }

    const finalPaths = [...mergedPathsSet].sort();
    const manifestData = {
      toolkit: '@doni354/vibe-kit',
      version: VERSION,
      scope: opts.scope,
      profile: opts.profile,
      packs: opts.packs || (opts.profile ? [opts.profile] : []),
      installedAt: oldManifest?.installedAt || now,
      updatedAt: now,
      paths: finalPaths,
      files: mergedFiles
    };

    ensureDir(path.dirname(manifestPath), io);
    io.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2) + '\n');

    for (const entry of journal) {
      if (entry.rollbackBackupPath && io.existsSync(entry.rollbackBackupPath)) {
        try { io.unlinkSync(entry.rollbackBackupPath); } catch {}
      }
    }
  } catch (err) {
    for (let i = journal.length - 1; i >= 0; i--) {
      const entry = journal[i];
      if (entry.type === 'CREATE') {
        try { if (io.existsSync(entry.path)) io.unlinkSync(entry.path); } catch {}
      } else if (entry.type === 'OVERWRITE') {
        try {
          if (io.existsSync(entry.rollbackBackupPath)) {
            io.copyFileSync(entry.rollbackBackupPath, entry.path);
            io.unlinkSync(entry.rollbackBackupPath);
          }
        } catch {}
      }
    }
    if (initialManifestContent !== null) {
      try { io.writeFileSync(manifestPath, initialManifestContent); } catch {}
    } else {
      try { if (io.existsSync(manifestPath)) io.unlinkSync(manifestPath); } catch {}
    }
    throw new Error(`Instalasi gagal: ${err.message}. Perubahan telah di-rollback.`);
  }

  console.log(`\nSelesai. Manifest diperbarui di ${path.basename(manifestPath)}.`);
}

export async function init(opts) {
  const io = getFs(opts);
  const scope = opts.scope || (input.isTTY
    ? await choose('Pasang workflow di mana?', [
        { label: 'Workspace ini saja (direkomendasikan)', value: 'workspace' },
        { label: 'Global untuk user ini', value: 'global' }
      ], 'workspace')
    : 'workspace');

  if (!['workspace', 'global'].includes(scope)) {
    throw new Error('Scope harus "workspace" atau "global".');
  }

  const defaultGlobalTarget = path.join(os.homedir(), '.gemini', 'config');
  let target = opts.target ? path.resolve(opts.target) : (scope === 'workspace' ? process.cwd() : defaultGlobalTarget);

  if (scope === 'workspace') {
    if (!io.existsSync(target) || !io.statSync(target).isDirectory()) {
      throw new Error(`Folder target tidak ditemukan atau bukan direktori: ${target}`);
    }
    const repo = path.resolve(ROOT);
    if (isPathEqual(target, repo) || isStrictlyInside(target, repo, io) || isStrictlyInside(repo, target, io)) {
      throw new Error('Jalankan CLI dari folder proyek, bukan folder toolkit atau parent-nya.');
    }
  }

  let requestedPacks = [];
  let profile = opts.profile || null;

  if (opts.profile) {
    if (!PROFILES[opts.profile]) {
      throw new Error(`Profil tidak valid: "${opts.profile}". Pilihan: base, frontend, backend, fullstack.`);
    }
    requestedPacks.push(...mapLegacyProfileToPacks(opts.profile));
  }

  if (opts.pack) {
    const rawPacks = opts.pack.split(',').map(s => s.trim()).filter(Boolean);
    if (rawPacks.length === 0) {
      throw new Error('Flag "--pack" membutuhkan minimal satu pack ID yang valid.');
    }
    requestedPacks.push(...rawPacks);
  }

  let projectConfig = null;
  if (scope === 'workspace') {
    const configFilePath = path.join(target, CONFIG_FILE);
    if (io.existsSync(configFilePath)) {
      try {
        projectConfig = loadProjectConfig(target, io);
      } catch (err) {
        throw new Error(`File konfigurasi "${CONFIG_FILE}" korup atau tidak valid: ${err.message}. Perbaiki atau hapus file tersebut sebelum melanjutkan instalasi.`);
      }
    } else {
      try {
        projectConfig = refreshProjectConfig(target, io);
      } catch {}
    }
  }

  if (requestedPacks.length === 0) {
    if (input.isTTY) {
      const choices = [];
      const recommendedPacks = projectConfig?.resolved?.effectivePacks || ['role:fullstack'];
      const detectedTechs = projectConfig?.resolved?.technologies || [];

      if (detectedTechs.length > 0) {
        choices.push({
          label: `Rekomendasi stack (${detectedTechs.map(t => t.name).join(', ')} -> ${recommendedPacks.join(', ')})`,
          value: 'recommended'
        });
      }
      choices.push(
        { label: 'Base — onboarding, dokumentasi, verification', value: 'base' },
        { label: 'Frontend — base + UI design system dan visual review', value: 'frontend' },
        { label: 'Backend — base + backend feature', value: 'backend' },
        { label: 'Fullstack — semua skills', value: 'fullstack' }
      );

      const defaultChoice = choices[0].value;
      const selected = await choose('Pilih profil workflow:', choices, defaultChoice);

      if (selected === 'recommended') {
        requestedPacks = [...recommendedPacks];
        profile = null;
      } else {
        profile = selected;
        if (!PROFILES[profile]) throw new Error(`Profil tidak valid: ${profile}`);
        requestedPacks = mapLegacyProfileToPacks(profile);
      }
    } else {
      // Non-interactive
      const existingConfig = loadProjectConfig(target, io);
      if (existingConfig && existingConfig.overrides?.packs && existingConfig.overrides.packs.length > 0) {
        requestedPacks = [...existingConfig.overrides.packs];
      } else if (existingConfig && existingConfig.resolved?.effectivePacks?.length > 0) {
        requestedPacks = [...existingConfig.resolved.effectivePacks];
      } else {
        profile = 'fullstack';
        requestedPacks = mapLegacyProfileToPacks('fullstack');
        console.log('Catatan: Konfigurasi proyek tidak ditemukan. Menggunakan fallback kompatibilitas CLI legacy: profil "fullstack".');
      }
    }
  }

  // Deduplicate requested packs while preserving input order
  requestedPacks = Array.from(new Set(requestedPacks));

  const resolution = resolvePacks(requestedPacks, undefined, { rootDir: ROOT, io });
  const files = resolvePackFiles(resolution.packs, scope, target, ROOT, io);

  console.log(`\nTarget:  ${target}`);
  console.log(`Scope:   ${scope}`);
  if (profile) console.log(`Profil:  ${profile}`);
  console.log(`Packs:   ${resolution.resolved.join(', ')}`);
  console.log(`Installer hanya menyalin workflow assets; source code aplikasi tidak diubah.`);

  const manifestPath = path.join(target, scope === 'workspace' ? MANIFEST : GLOBAL_MANIFEST);

  if (opts['dry-run']) {
    const preview = previewResolution(resolution, scope, target, ROOT, io, opts);
    console.log(`\n--- [DRY-RUN RESOLUTION PREVIEW] ---`);
    console.log(`Requested packs:        ${preview.requested.join(', ')}`);
    console.log(`Included dependencies:  ${preview.dependencies.length > 0 ? preview.dependencies.join(', ') : '(none)'}`);
    console.log(`Final pack order:       ${preview.resolvedPacks.join(' -> ')}`);
    if (preview.duplicates.length > 0) {
      console.log(`Shared/Duplicate assets:`);
      for (const d of preview.duplicates) {
        console.log(`  - ${d.dest} (from: ${d.contributedBy.join(', ')})`);
      }
    }
    console.log(`\nIntended file actions:`);
    for (const fa of preview.fileActions) {
      if (fa.action === 'CREATE') {
        console.log(`[CREATE] ${fa.relPath} (from: ${fa.packId})`);
      } else if (fa.action === 'IDENTICAL') {
        console.log(`[IDENTICAL - NO CHANGE] ${fa.relPath} (from: ${fa.packId})`);
      } else if (fa.action === 'CONFLICT') {
        console.log(`[CONFLICT — ${fa.policyAction}] ${fa.relPath} (from: ${fa.packId})`);
      }
    }
    console.log('\nDry-run selesai. Tidak ada file atau direktori yang ditulis.');
    return;
  }

  if (!opts.yes && input.isTTY) {
    if (!(await confirm('Lanjutkan instalasi?', true))) {
      console.log('Dibatalkan.');
      return;
    }
  }

  await applyFiles(files, { ...opts, scope, profile: profile || resolution.resolved[resolution.resolved.length - 1], packs: resolution.resolved }, manifestPath, target);

  if (scope === 'workspace' && !opts['dry-run']) {
    try {
      const finalConfig = refreshProjectConfig(target, io);
      saveProjectConfig(target, finalConfig, io);
    } catch {}
  }
}

export async function update(opts) {
  const io = getFs(opts);
  const scope = opts.scope || 'workspace';
  const defaultGlobalTarget = path.join(os.homedir(), '.gemini', 'config');
  const target = opts.target ? path.resolve(opts.target) : (scope === 'global' ? defaultGlobalTarget : process.cwd());
  const manifestPath = path.join(target, scope === 'workspace' ? MANIFEST : GLOBAL_MANIFEST);

  if (!io.existsSync(manifestPath)) {
    throw new Error(`Manifest tidak ditemukan di "${target}". Jalankan "vibe-kit init" terlebih dahulu untuk memasang workflow.`);
  }

  let manifest;
  try {
    manifest = JSON.parse(io.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`Manifest korup atau tidak valid di "${manifestPath}": ${err.message}. Proses update dihentikan demi keamanan data.`);
  }

  if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.paths)) {
    throw new Error(`Struktur manifest di "${manifestPath}" tidak valid. Proses update dihentikan.`);
  }

  let requestedPacks = [];
  let profile = opts.profile || null;

  if (opts.profile) {
    if (!PROFILES[opts.profile]) {
      throw new Error(`Profil "${opts.profile}" tidak dikenal. Pilihan: base, frontend, backend, fullstack.`);
    }
    requestedPacks.push(...mapLegacyProfileToPacks(opts.profile));
  }

  if (opts.pack) {
    const rawPacks = opts.pack.split(',').map(s => s.trim()).filter(Boolean);
    if (rawPacks.length === 0) {
      throw new Error('Flag "--pack" membutuhkan minimal satu pack ID yang valid.');
    }
    requestedPacks.push(...rawPacks);
  }

  let usingLegacyProfileFallback = false;

  if (requestedPacks.length === 0) {
    if (Array.isArray(manifest.packs) && manifest.packs.length > 0) {
      requestedPacks = [...manifest.packs];
      profile = manifest.profile || null;
    } else if (manifest.profile) {
      profile = manifest.profile;
      if (!PROFILES[profile]) {
        throw new Error(`Profil "${profile}" tidak dikenal. Pilihan: base, frontend, backend, fullstack.`);
      }
      usingLegacyProfileFallback = true;
    } else {
      profile = 'fullstack';
      usingLegacyProfileFallback = true;
    }
  }

  requestedPacks = Array.from(new Set(requestedPacks));

  console.log(`\nMemeriksa pembaruan workflow assets...`);
  console.log(`Target:  ${target}`);
  console.log(`Scope:   ${scope}`);
  if (profile) console.log(`Profile: ${profile}`);
  console.log(`Toolkit: @doni354/vibe-kit v${VERSION}\n`);

  let sourceFileList;
  let resolvedPacks = null;

  if (!usingLegacyProfileFallback) {
    const res = resolvePacks(requestedPacks, undefined, { rootDir: ROOT, io });
    resolvedPacks = res.resolved;
    sourceFileList = resolvePackFiles(res.packs, scope, target, ROOT, io);
  } else {
    sourceFileList = sourceFiles(scope, target, profile);
    resolvedPacks = mapLegacyProfileToPacks(profile);
  }
  for (const f of sourceFileList) {
    if (!io.existsSync(f.src)) {
      throw new Error(`Asset toolkit hilang atau tidak ditemukan: ${f.src}. Update dibatalkan sebelum mengubah file apa pun.`);
    }
    if (!isStrictlyInside(f.dest, target, io)) {
      throw new Error(`Path tujuan tidak aman di luar target: ${f.dest}. Update dibatalkan.`);
    }
  }

  const sourceMap = new Map();
  for (const f of sourceFileList) {
    const relPosix = toPosixRelative(f.dest, target);
    sourceMap.set(relPosix, f);
  }

  const manifestFiles = manifest.files || {};
  const manifestPathsSet = new Set();
  for (const p of manifest.paths) {
    if (typeof p === 'string') {
      if (path.isAbsolute(p)) {
        if (isStrictlyInside(p, target, io)) {
          manifestPathsSet.add(toPosixRelative(p, target));
        }
      } else {
        manifestPathsSet.add(p.split(/[/\\]/).join('/'));
      }
    }
  }

  const allPaths = new Set([...manifestPathsSet, ...sourceMap.keys()]);
  const sortedPaths = [...allPaths].sort();

  const operations = [];

  for (const relPath of sortedPaths) {
    let destPath;
    try {
      destPath = fromPosixRelative(relPath, target, io);
    } catch {
      continue;
    }

    const inSource = sourceMap.has(relPath);
    const inManifest = manifestPathsSet.has(relPath);
    const fileOnDiskExists = io.existsSync(destPath);
    const sourceObj = inSource ? sourceMap.get(relPath) : null;
    const sourceHash = sourceObj ? computeFileHash(sourceObj.src, io) : null;
    const diskHash = fileOnDiskExists ? computeFileHash(destPath, io) : null;
    const recordedHash = manifestFiles[relPath]?.hash || null;

    if (!inSource) {
      operations.push({
        type: 'RETAIN',
        relPath,
        dest: destPath,
        reason: 'Asset tidak lagi disediakan toolkit (dipertahankan)',
        hash: diskHash || recordedHash
      });
      continue;
    }

    if (!inManifest) {
      if (fileOnDiskExists) {
        if (diskHash === sourceHash) {
          operations.push({ type: 'UNCHANGED', relPath, dest: destPath, hash: diskHash });
        } else {
          operations.push({
            type: 'NEW_CONFLICT',
            relPath,
            src: sourceObj.src,
            dest: destPath,
            sourceHash,
            diskHash
          });
        }
      } else {
        operations.push({
          type: 'ADD',
          relPath,
          src: sourceObj.src,
          dest: destPath,
          sourceHash
        });
      }
      continue;
    }

    if (!fileOnDiskExists) {
      if (opts.force) {
        operations.push({
          type: 'RECREATE',
          relPath,
          src: sourceObj.src,
          dest: destPath,
          sourceHash
        });
      } else {
        operations.push({
          type: 'SKIP_DELETED',
          relPath,
          dest: destPath,
          reason: 'File dihapus oleh user'
        });
      }
      continue;
    }

    if (diskHash === sourceHash) {
      operations.push({ type: 'UNCHANGED', relPath, dest: destPath, hash: diskHash });
      continue;
    }

    const isUserModified = recordedHash && diskHash !== recordedHash;

    if (!isUserModified) {
      operations.push({
        type: 'UPDATE',
        relPath,
        src: sourceObj.src,
        dest: destPath,
        sourceHash
      });
    } else {
      operations.push({
        type: 'USER_MODIFIED_CONFLICT',
        relPath,
        src: sourceObj.src,
        dest: destPath,
        sourceHash,
        diskHash
      });
    }
  }

  if (opts['dry-run']) {
    console.log(`--- [DRY-RUN PREVIEW UPDATE] ---`);
    for (const op of operations) {
      switch (op.type) {
        case 'UNCHANGED':
          console.log(`[UNCHANGED] ${op.relPath}`);
          break;
        case 'UPDATE':
          console.log(`[UPDATE] ${op.relPath} (Toolkit memiliki versi baru)`);
          break;
        case 'ADD':
          console.log(`[ADD] ${op.relPath} (File baru dari profil ${profile})`);
          break;
        case 'SKIP_DELETED':
          console.log(`[SKIPPED - USER DELETED] ${op.relPath} (${op.reason}. Gunakan --force untuk membuat ulang)`);
          break;
        case 'RECREATE':
          console.log(`[RECREATE (FORCE)] ${op.relPath}`);
          break;
        case 'RETAIN':
          console.log(`[RETAINED] ${op.relPath} (${op.reason})`);
          break;
        case 'USER_MODIFIED_CONFLICT':
          console.log(`[CONFLICT - USER MODIFIED] ${op.relPath} (Akan dipertahankan atau ditanyakan sesuai kebijakan)`);
          break;
        case 'NEW_CONFLICT':
          console.log(`[CONFLICT - FILE EXISTS] ${op.relPath}`);
          break;
      }
    }
    console.log(`\nDry-run selesai. Tidak ada file yang diubah.`);
    return;
  }

  const initialManifestContent = io.readFileSync(manifestPath, 'utf8');
  const journal = [];
  const updatedRecords = { ...manifestFiles };
  const updatedPathsSet = new Set(manifestPathsSet);

  try {
    for (const op of operations) {
      if (op.type === 'UNCHANGED') {
        console.log(`[UNCHANGED] ${op.relPath}`);
        updatedRecords[op.relPath] = {
          hash: op.hash,
          installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
          updatedAt: manifestFiles[op.relPath]?.updatedAt || new Date().toISOString()
        };
        updatedPathsSet.add(op.relPath);
      } else if (op.type === 'RETAIN') {
        console.log(`[RETAINED] ${op.relPath}`);
        if (op.hash) {
          updatedRecords[op.relPath] = {
            hash: op.hash,
            installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
            updatedAt: manifestFiles[op.relPath]?.updatedAt || new Date().toISOString()
          };
          updatedPathsSet.add(op.relPath);
        }
      } else if (op.type === 'SKIP_DELETED') {
        console.log(`[SKIPPED - USER DELETED] ${op.relPath}`);
        updatedPathsSet.add(op.relPath);
      } else if (op.type === 'UPDATE') {
        const rollbackBackupPath = `${op.dest}.vibe-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        io.copyFileSync(op.dest, rollbackBackupPath);
        journal.push({ type: 'OVERWRITE', path: op.dest, rollbackBackupPath });

        ensureDir(path.dirname(op.dest), io);
        io.copyFileSync(op.src, op.dest);
        console.log(`[UPDATE] ${op.relPath}`);

        updatedRecords[op.relPath] = {
          hash: op.sourceHash,
          installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedPathsSet.add(op.relPath);
      } else if (op.type === 'ADD' || op.type === 'RECREATE') {
        ensureDir(path.dirname(op.dest), io);
        const existsBefore = io.existsSync(op.dest);
        if (existsBefore) {
          const rollbackBackupPath = `${op.dest}.vibe-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          io.copyFileSync(op.dest, rollbackBackupPath);
          journal.push({ type: 'OVERWRITE', path: op.dest, rollbackBackupPath });
        } else {
          journal.push({ type: 'CREATE', path: op.dest });
        }

        io.copyFileSync(op.src, op.dest);
        console.log(`[${op.type}] ${op.relPath}`);

        updatedRecords[op.relPath] = {
          hash: op.sourceHash,
          installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedPathsSet.add(op.relPath);
      } else if (op.type === 'USER_MODIFIED_CONFLICT' || op.type === 'NEW_CONFLICT') {
        let choice = opts.conflict;
        if (!choice) {
          if (opts.yes || !input.isTTY) {
            choice = 'keep';
            console.log(`[KEPT - USER MODIFIED] ${op.relPath}`);
          } else {
            choice = await choose(`File telah dimodifikasi oleh user:\n${op.relPath}`, [
              { label: 'Pertahankan file lokal saat ini (keep)', value: 'keep' },
              { label: 'Backup lalu ganti dengan versi toolkit terbaru (replace)', value: 'replace' },
              { label: 'Skip file ini (skip)', value: 'skip' }
            ], 'keep');
          }
        }

        if (choice === 'skip') {
          console.log(`[SKIPPED] ${op.relPath}`);
          updatedPathsSet.add(op.relPath);
        } else if (choice === 'keep') {
          console.log(`[KEPT] ${op.relPath}`);
          updatedRecords[op.relPath] = {
            hash: op.diskHash,
            installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          updatedPathsSet.add(op.relPath);
        } else if (choice === 'replace') {
          const userBackup = createSafeBackup(op.dest, io);
          console.log(`[BACKUP] ${userBackup}`);

          const rollbackBackupPath = `${op.dest}.vibe-rollback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          io.copyFileSync(op.dest, rollbackBackupPath);
          journal.push({ type: 'OVERWRITE', path: op.dest, rollbackBackupPath, userBackupPath: userBackup });

          io.copyFileSync(op.src, op.dest);
          console.log(`[REPLACED] ${op.relPath}`);

          updatedRecords[op.relPath] = {
            hash: op.sourceHash,
            installedAt: manifestFiles[op.relPath]?.installedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          updatedPathsSet.add(op.relPath);
        }
      }
    }

    const now = new Date().toISOString();
    const finalPaths = [...updatedPathsSet].sort();
    const updatedManifest = {
      toolkit: '@doni354/vibe-kit',
      version: VERSION,
      scope: scope,
      profile: profile || (resolvedPacks && resolvedPacks.length > 0 ? resolvedPacks[resolvedPacks.length - 1] : (manifest.profile || 'fullstack')),
      packs: resolvedPacks || manifest.packs || (profile ? mapLegacyProfileToPacks(profile) : []),
      installedAt: manifest.installedAt || now,
      updatedAt: now,
      paths: finalPaths,
      files: updatedRecords
    };

    io.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2) + '\n');

    for (const entry of journal) {
      if (entry.rollbackBackupPath && io.existsSync(entry.rollbackBackupPath)) {
        try { io.unlinkSync(entry.rollbackBackupPath); } catch {}
      }
    }
  } catch (err) {
    for (let i = journal.length - 1; i >= 0; i--) {
      const entry = journal[i];
      if (entry.type === 'CREATE') {
        try { if (io.existsSync(entry.path)) io.unlinkSync(entry.path); } catch {}
      } else if (entry.type === 'OVERWRITE') {
        try {
          if (io.existsSync(entry.rollbackBackupPath)) {
            io.copyFileSync(entry.rollbackBackupPath, entry.path);
            io.unlinkSync(entry.rollbackBackupPath);
          }
        } catch {}
      }
    }
    try {
      io.writeFileSync(manifestPath, initialManifestContent);
    } catch {}

    throw new Error(`Update gagal: ${err.message}. Perubahan telah di-rollback.`);
  }

  console.log(`\nSelesai. Workflow assets telah diperbarui ke versi v${VERSION}.`);
  console.log(`Catatan: Untuk memperbarui paket CLI itu sendiri, jalankan: npm update -g @doni354/vibe-kit`);

  if (scope === 'workspace' && !opts['dry-run']) {
    try {
      if (io.existsSync(path.join(target, CONFIG_FILE))) {
        const finalConfig = refreshProjectConfig(target, io);
        saveProjectConfig(target, finalConfig, io);
      }
    } catch {}
  }
}

export async function uninstall(opts) {
  const io = getFs(opts);
  const scope = opts.scope || (input.isTTY
    ? await choose('Uninstall dari mana?', [
        { label: 'Workspace saat ini', value: 'workspace' },
        { label: 'Global', value: 'global' }
      ], 'workspace')
    : 'workspace');

  const defaultGlobalTarget = path.join(os.homedir(), '.gemini', 'config');
  const target = opts.target ? path.resolve(opts.target) : (scope === 'global' ? defaultGlobalTarget : process.cwd());
  const manifestPath = path.join(target, scope === 'workspace' ? MANIFEST : GLOBAL_MANIFEST);

  if (!io.existsSync(manifestPath)) {
    throw new Error(`Manifest tidak ditemukan: ${manifestPath}. Tidak ada file yang dihapus.`);
  }

  let manifest;
  try {
    manifest = JSON.parse(io.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`Manifest korup atau tidak dapat dibaca: ${err.message}.`);
  }

  const deletedFiles = [];
  const trackedPaths = manifest.paths || [];
  const filesMap = manifest.files || {};

  for (const p of trackedPaths) {
    let destPath;
    try {
      destPath = fromPosixRelative(p, target, io);
    } catch (err) {
      console.log(`[SECURITY WARNING] ${err.message}. Dilewati.`);
      continue;
    }

    if (!isStrictlyInside(destPath, target, io)) {
      console.log(`[SECURITY WARNING] Path manifest berada di luar target: ${destPath}. Dilewati.`);
      continue;
    }

    if (!io.existsSync(destPath)) {
      console.log(`[MISSING] ${p}`);
      continue;
    }

    const currentHash = computeFileHash(destPath, io);
    const recordedHash = filesMap[p]?.hash;
    const isModified = recordedHash && currentHash && currentHash !== recordedHash;

    if (opts['dry-run']) {
      console.log(`[DRY RUN${isModified ? ' — USER MODIFIED' : ''}] ${p}`);
      continue;
    }

    if (isModified) {
      if (opts.force) {
        io.unlinkSync(destPath);
        deletedFiles.push(destPath);
        console.log(`[REMOVED (FORCE)] ${p}`);
      } else if (opts.yes || !input.isTTY) {
        console.log(`[KEPT - USER MODIFIED] ${p} (File telah dimodifikasi. Gunakan konfirmasi interaktif atau flag --force untuk menghapus.)`);
      } else {
        const proceed = await confirm(`PERINGATAN: File telah dimodifikasi oleh user!\n${p}\nTetap hapus file ini?`, false);
        if (proceed) {
          io.unlinkSync(destPath);
          deletedFiles.push(destPath);
          console.log(`[REMOVED] ${p}`);
        } else {
          console.log(`[KEPT] ${p}`);
        }
      }
    } else {
      let shouldDelete = false;
      if (opts.yes || !input.isTTY) {
        shouldDelete = true;
      } else {
        shouldDelete = await confirm(`Hapus file ${p}?`, true);
      }

      if (shouldDelete) {
        io.unlinkSync(destPath);
        deletedFiles.push(destPath);
        console.log(`[REMOVED] ${p}`);
      } else {
        console.log(`[KEPT] ${p}`);
      }
    }
  }

  if (opts['dry-run']) {
    console.log('\nDry-run uninstall selesai. Tidak ada file yang dihapus.');
    return;
  }

  for (const d of deletedFiles) {
    cleanEmptyParentDirs(d, target, io);
  }

  let removeManifest = false;
  if (opts.yes || !input.isTTY) {
    removeManifest = true;
  } else {
    removeManifest = await confirm(`Hapus file manifest (${path.basename(manifestPath)})?`, true);
  }

  if (removeManifest && io.existsSync(manifestPath)) {
    io.unlinkSync(manifestPath);
    console.log(`[REMOVED] ${path.basename(manifestPath)}`);
  }

  console.log('\nUninstall selesai.');
}

export function help() {
  console.log(`vibe-kit v${VERSION} — end-to-end AI coding workflow toolkit

Commands:
  vibe-kit init [--target PATH] [--scope workspace|global] [--profile base|frontend|backend|fullstack] [--pack PACK] [--conflict keep|replace|skip] [--dry-run] [--yes]
  vibe-kit detect [--target PATH] [--save] [--dry-run] [--json]
  vibe-kit config [--target PATH] [--show] [--enable TECH] [--disable TECH] [--reset] [--dry-run] [--json]
  vibe-kit update [--target PATH] [--scope workspace|global] [--profile base|frontend|backend|fullstack] [--pack PACK] [--conflict keep|replace|skip] [--dry-run] [--yes] [--force]
  vibe-kit uninstall [--target PATH] [--scope workspace|global] [--dry-run] [--yes] [--force]
  vibe-kit doctor [--target PATH]

Options:
  --pack PACK          Pilih pack secara eksplisit (misal: core, role:frontend)
  --enable TECH        Override teknologi untuk diaktifkan (misal: tech:postgresql)
  --disable TECH       Override teknologi untuk dinonaktifkan
  --reset              Hapus seluruh user overrides pada konfigurasi
  --save               Simpan hasil deteksi ke ${CONFIG_FILE}
  --json               Keluarkan output dalam format JSON mentah
  --dry-run            Preview tindakan tanpa menulis/menghapus file apa pun
  --yes                Lanjutkan tanpa konfirmasi awal (konflik file tetap aman)
  --conflict POLICY    Kebijakan konflik file yang sudah ada: keep (default), replace, skip
  --force              Paksa operasi penulisan ulang file yang dihapus atau penghapusan file yang dimodifikasi
  --version, -v        Tampilkan versi paket
  --help, -h           Tampilkan panduan bantuan ini

Catatan:
  Perintah update mengaplikasikan ulang workflow assets bawaan versi CLI ini.
  Untuk memperbarui paket CLI itu sendiri, jalankan: npm update -g @doni354/vibe-kit
`);
}

export async function detect(opts = {}) {
  const io = getFs(opts);
  const target = path.resolve(opts.target || process.cwd());

  let cfg;
  try {
    cfg = refreshProjectConfig(target, io);
  } catch (err) {
    throw new Error(`Deteksi proyek gagal: ${err.message}`);
  }

  if (opts.json) {
    console.log(JSON.stringify(cfg, null, 2));
    return cfg;
  }

  console.log(`\nvibe-kit detect — project stack inspection`);
  console.log(`------------------------------------------`);
  console.log(`Target:       ${target}`);
  console.log(`Detected at:  ${cfg.detected.detectedAt}`);

  if (cfg.detected.monorepo.isMonorepo) {
    console.log(`Monorepo:     Yes (${cfg.detected.monorepo.type || 'standard'})`);
    if (cfg.detected.monorepo.packages.length > 0) {
      console.log(`Sub-packages (${cfg.detected.monorepo.packages.length}):`);
      for (const p of cfg.detected.monorepo.packages) {
        const recStr = p.recommendedPacks && p.recommendedPacks.length > 0 ? ` -> Recommended: ${p.recommendedPacks.join(', ')}` : '';
        console.log(`  - ${p.path} (${p.technologies.map(t => t.name).join(', ')})${recStr}`);
      }
    }
  }

  console.log(`\nDetected technologies (${cfg.detected.technologies.length}):`);
  if (cfg.detected.technologies.length === 0) {
    console.log(`  (tidak ada teknologi khusus yang terdeteksi)`);
  } else {
    for (const t of cfg.detected.technologies) {
      const evidenceDetails = t.evidence.map(e => `${e.file} [${e.method}]`).join(', ');
      console.log(`  - [${t.confidence.toUpperCase()}] ${t.name} (${t.category}) — ${evidenceDetails}`);
    }
  }

  if (cfg.overrides.enabled.length > 0 || cfg.overrides.disabled.length > 0) {
    console.log(`\nUser Overrides:`);
    if (cfg.overrides.enabled.length > 0) {
      console.log(`  Enabled:  ${cfg.overrides.enabled.join(', ')}`);
    }
    if (cfg.overrides.disabled.length > 0) {
      console.log(`  Disabled: ${cfg.overrides.disabled.join(', ')}`);
    }
  }

  console.log(`\nRecommended packs:`);
  console.log(`  ${cfg.resolved.recommendedPacks.join(', ')}`);
  console.log(`Effective packs:`);
  console.log(`  ${cfg.resolved.effectivePacks.join(', ')}`);

  if (opts['dry-run']) {
    console.log(`\n[DRY-RUN] Konfigurasi tidak ditulis ke ${CONFIG_FILE}.`);
    return cfg;
  }

  if (opts.save) {
    saveProjectConfig(target, cfg, io);
    console.log(`\nKonfigurasi tersimpan ke ${CONFIG_FILE}.`);
  } else {
    console.log(`\nTip: Jalankan "vibe-kit detect --save" untuk menyimpan konfigurasi ini ke ${CONFIG_FILE}.`);
  }

  return cfg;
}

export async function config(opts = {}) {
  const io = getFs(opts);
  const target = path.resolve(opts.target || process.cwd());

  const enableList = opts.enable ? opts.enable.split(',').map(s => s.trim()).filter(Boolean) : [];
  const disableList = opts.disable ? opts.disable.split(',').map(s => s.trim()).filter(Boolean) : [];
  const packList = opts.pack ? opts.pack.split(',').map(s => s.trim()).filter(Boolean) : null;

  let options = {};
  if (enableList.length > 0) options.enable = enableList;
  if (disableList.length > 0) options.disable = disableList;
  if (packList !== null) options.packs = packList;
  if (opts.reset) options.resetOverrides = true;

  const hasModifications = enableList.length > 0 || disableList.length > 0 || packList !== null || opts.reset;

  let cfg;
  if (hasModifications) {
    cfg = refreshProjectConfig(target, io, options);
    if (!opts['dry-run']) {
      saveProjectConfig(target, cfg, io);
    }
  } else {
    cfg = loadProjectConfig(target, io) || refreshProjectConfig(target, io);
  }

  if (opts.json) {
    console.log(JSON.stringify(cfg, null, 2));
    return cfg;
  }

  console.log(`\nvibe-kit config — project configuration`);
  console.log(`----------------------------------------`);
  console.log(`Target:   ${target}`);
  console.log(`Version:  v${cfg.version}`);

  console.log(`\nUser Overrides:`);
  console.log(`  Enabled:  ${cfg.overrides.enabled.length > 0 ? cfg.overrides.enabled.join(', ') : '(none)'}`);
  console.log(`  Disabled: ${cfg.overrides.disabled.length > 0 ? cfg.overrides.disabled.join(', ') : '(none)'}`);
  console.log(`  Packs:    ${cfg.overrides.packs && cfg.overrides.packs.length > 0 ? cfg.overrides.packs.join(', ') : '(none)'}`);

  console.log(`\nResolved Technologies:`);
  for (const t of cfg.resolved.technologies) {
    console.log(`  - ${t.name} (${t.source})`);
  }

  console.log(`\nEffective Packs:`);
  console.log(`  ${cfg.resolved.effectivePacks.join(', ')}`);

  if (hasModifications) {
    if (opts['dry-run']) {
      console.log(`\n[DRY-RUN] Perubahan konfigurasi tidak disimpan.`);
    } else {
      console.log(`\nKonfigurasi berhasil diperbarui di ${CONFIG_FILE}.`);
    }
  }

  return cfg;
}

export async function doctor(opts = {}) {
  const io = getFs(opts);
  const target = path.resolve(opts.target || process.cwd());
  const manifestPath = path.join(target, MANIFEST);
  const globalTarget = path.join(os.homedir(), '.gemini', 'config');

  console.log(`vibe-kit doctor — diagnostic report`);
  console.log(`-----------------------------------`);
  console.log(`CLI Version:       v${VERSION}`);
  console.log(`Node.js:           ${process.version} (Platform: ${process.platform})`);
  console.log(`Current folder:    ${process.cwd()}`);
  console.log(`Target workspace:  ${target}`);
  console.log(`Workspace skills:  ${path.join(target, '.agents', 'skills')}`);
  console.log(`Global skills:     ${path.join(globalTarget, 'skills')}`);

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  function report(status, title, details = '') {
    if (status === 'PASS') {
      passCount++;
      console.log(`  [PASS] ${title}${details ? ` — ${details}` : ''}`);
    } else if (status === 'WARN') {
      warnCount++;
      console.log(`  [WARN] ${title}${details ? ` — ${details}` : ''}`);
    } else {
      failCount++;
      console.log(`  [FAIL] ${title}${details ? ` — ${details}` : ''}`);
    }
  }

  console.log(`\nPemeriksaan Diagnostik:`);

  // 1. Node.js Engine Check
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor >= 18) {
    report('PASS', `Versi Node.js (${process.version}) memenuhi syarat engine >=18`);
  } else {
    report('FAIL', `Versi Node.js (${process.version}) di bawah batas minimum >=18`);
  }

  // 2. Toolkit Source Assets Integrity Check
  let toolkitAssetsOk = true;
  for (const prof of Object.keys(PROFILES)) {
    for (const skill of PROFILES[prof]) {
      const skillFile = path.join(ROOT, 'skills', skill, 'SKILL.md');
      if (!io.existsSync(skillFile)) {
        toolkitAssetsOk = false;
        break;
      }
    }
  }
  const wsRuleFile = path.join(ROOT, 'rules', 'workspace', 'engineering-standards.md');
  const glRuleFile = path.join(ROOT, 'rules', 'global', 'engineering-standards.md');
  if (toolkitAssetsOk && io.existsSync(wsRuleFile) && io.existsSync(glRuleFile)) {
    report('PASS', `Struktur dan file asset sumber toolkit lengkap`);
  } else {
    report('FAIL', `Asset sumber toolkit tidak lengkap atau ada file yang hilang`);
  }

  // 3. Target Permissions & Directory Check
  if (io.existsSync(target)) {
    try {
      const st = io.statSync(target);
      if (st.isDirectory()) {
        try {
          io.accessSync(target, fs.constants.R_OK | fs.constants.W_OK);
          report('PASS', `Direktori target memiliki izin baca dan tulis`);
        } catch {
          report('FAIL', `Direktori target tidak memiliki izin baca/tulis yang cukup`);
        }
      } else {
        report('FAIL', `Target bukan merupakan sebuah direktori: ${target}`);
      }
    } catch (err) {
      report('FAIL', `Gagal mengakses target: ${err.message}`);
    }
  } else {
    report('WARN', `Direktori target belum ada di disk: ${target}`);
  }

  // 4. Manifest Health, Format & Path Security
  const hasManifest = io.existsSync(manifestPath);
  console.log(`\nStatus Manifes:`);
  console.log(`Manifest status:   ${hasManifest ? `Ditemukan (${MANIFEST})` : 'Belum terpasang'}`);

  if (!hasManifest) {
    report('WARN', `Manifes Vibe Kit belum terpasang di target (${MANIFEST})`);
  } else {
    let manifestData = null;
    let manifestParseOk = false;
    try {
      manifestData = JSON.parse(io.readFileSync(manifestPath, 'utf8'));
      manifestParseOk = true;
    } catch (err) {
      report('FAIL', `File manifes korup atau bukan JSON valid`, err.message);
    }

    if (manifestParseOk) {
      if (!manifestData || typeof manifestData !== 'object' || !Array.isArray(manifestData.paths)) {
        report('FAIL', `Struktur format manifes tidak valid (field paths hilang atau bukan array)`);
      } else {
        report('PASS', `Format manifes valid (v${manifestData.version || '0.1.0'}, profile: ${manifestData.profile || 'unknown'})`);

        let pathSecurityOk = true;
        let unsafePaths = [];
        for (const p of manifestData.paths) {
          try {
            const dest = fromPosixRelative(p, target, io);
            if (!isStrictlyInside(dest, target, io)) {
              pathSecurityOk = false;
              unsafePaths.push(p);
            }
          } catch {
            pathSecurityOk = false;
            unsafePaths.push(p);
          }
        }

        if (pathSecurityOk) {
          report('PASS', `Seluruh ${manifestData.paths.length} path dalam manifes aman dan berada di dalam target`);
        } else {
          report('FAIL', `Ditemukan path yang tidak aman / escaping target dalam manifes`, unsafePaths.join(', '));
        }

        let missingFiles = [];
        let modifiedFiles = [];
        let intactCount = 0;
        const filesMap = manifestData.files || {};

        for (const p of manifestData.paths) {
          let dest;
          try {
            dest = fromPosixRelative(p, target, io);
          } catch {
            continue;
          }

          if (!io.existsSync(dest)) {
            missingFiles.push(p);
          } else {
            const currentHash = computeFileHash(dest, io);
            const recordedHash = filesMap[p]?.hash;
            if (recordedHash && currentHash && currentHash !== recordedHash) {
              modifiedFiles.push(p);
            } else {
              intactCount++;
            }
          }
        }

        if (missingFiles.length === 0 && modifiedFiles.length === 0) {
          report('PASS', `Semua file terpasang (${intactCount} file) utuh dan sesuai hash manifes`);
        } else {
          if (missingFiles.length > 0) {
            report('WARN', `${missingFiles.length} file yang dilacak hilang dari disk`, missingFiles.join(', '));
          }
          if (modifiedFiles.length > 0) {
            report('WARN', `${modifiedFiles.length} file telah dimodifikasi oleh pengguna`, modifiedFiles.join(', '));
          }
        }
      }
    }
  }

  // 5. Project Stack Configuration (.vibe-kit.json)
  const configFilePath = path.join(target, CONFIG_FILE);
  if (io.existsSync(configFilePath)) {
    try {
      const cfg = loadProjectConfig(target, io);
      const techCount = cfg.resolved?.technologies?.length || 0;
      const overrideCount = (cfg.overrides?.enabled?.length || 0) + (cfg.overrides?.disabled?.length || 0) + (cfg.overrides?.packs?.length || 0);
      report('PASS', `Konfigurasi proyek (${CONFIG_FILE}) valid`, `schema v${cfg.version}, ${techCount} teknologi terdeteksi, ${overrideCount} override`);

      if (Array.isArray(cfg.resolved?.effectivePacks) && cfg.resolved.effectivePacks.length > 0) {
        try {
          resolvePacks(cfg.resolved.effectivePacks, undefined, { rootDir: ROOT, io });
          report('PASS', `Pack dalam konfigurasi proyek (${CONFIG_FILE}) valid`, `Packs: ${cfg.resolved.effectivePacks.join(', ')}`);
        } catch (packErr) {
          report('FAIL', `Pack dalam konfigurasi proyek (${CONFIG_FILE}) tidak valid`, packErr.message);
        }
      }
    } catch (err) {
      report('FAIL', `File konfigurasi proyek (${CONFIG_FILE}) korup atau tidak valid`, err.message);
    }
  }

  // 6. Antigravity Customization Directories (with Symlink Containment Check)
  const workspaceAgents = path.join(target, '.agents');
  const workspaceSkills = path.join(target, '.agents', 'skills');
  const workspaceRules = path.join(target, '.agents', 'rules');
  console.log(`\nAntigravity Integrasi:`);
  console.log(`Agents dir exists: ${pathOrLinkExists(workspaceAgents, io)}`);
  console.log(`Skills dir exists: ${pathOrLinkExists(workspaceSkills, io)}`);
  console.log(`Rules dir exists:  ${pathOrLinkExists(workspaceRules, io)}`);

  if (pathOrLinkExists(workspaceAgents, io) && !isStrictlyInside(workspaceAgents, target, io)) {
    report('FAIL', `Workspace agents direktori (${workspaceAgents}) merupakan link yang mengarah ke luar target`);
  }
  if (pathOrLinkExists(workspaceSkills, io) && !isStrictlyInside(workspaceSkills, target, io)) {
    report('FAIL', `Workspace skills direktori (${workspaceSkills}) merupakan link yang mengarah ke luar target`);
  }
  if (pathOrLinkExists(workspaceRules, io) && !isStrictlyInside(workspaceRules, target, io)) {
    report('FAIL', `Workspace rules direktori (${workspaceRules}) merupakan link yang mengarah ke luar target`);
  }

  console.log(`\nRingkasan: ${passCount} PASS, ${warnCount} WARN, ${failCount} FAIL`);
  if (failCount > 0) {
    console.log(`Status Diagnostik: FAIL (Terdapat masalah yang harus diperbaiki)`);
    process.exitCode = 1;
  } else if (warnCount > 0) {
    console.log(`Status Diagnostik: WARN (Ada catatan atau peringatan)`);
  } else {
    console.log(`Status Diagnostik: PASS (Semua komponen dalam kondisi prima)`);
  }
}

export async function run(args, runtimeOpts = {}) {
  const opts = { ...parseArgs(args), ...runtimeOpts };
  if (opts.version) {
    console.log(`@doni354/vibe-kit v${VERSION}`);
    return;
  }
  if (opts.help) {
    help();
    return;
  }

  const command = opts._[0] || 'init';
  if (command === 'help') return help();
  if (command === 'doctor') return doctor(opts);
  if (command === 'detect') return detect(opts);
  if (command === 'config') return config(opts);
  if (command === 'init') return init(opts);
  if (command === 'update') return update(opts);
  if (command === 'uninstall') return uninstall(opts);

  throw new Error(`Command tidak dikenal: "${command}". Jalankan vibe-kit --help untuk bantuan.`);
}
