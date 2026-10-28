/**
 * Deterministic Pack Resolver & Preview for Vibe Kit (Phase 1)
 *
 * Resolves pack dependencies, detects cycles, prevents conflicts, distinguishes
 * explicitly requested packs from automatically included dependencies, avoids
 * duplicate assets, and produces dry-run resolution previews without filesystem mutation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { isValidPackId } from './pack-contract.js';
import { PACK_REGISTRY } from './packs.js';
import { isStrictlyInside, computeFileHash } from './cli.js';

/**
 * Legacy profile to pack mapping for 100% backward compatibility.
 */
export const LEGACY_PROFILE_MAP = Object.freeze({
  base: ['core'],
  frontend: ['role:frontend'],
  backend: ['role:backend'],
  fullstack: ['role:fullstack']
});

/**
 * Maps a legacy profile name to its corresponding pack IDs.
 *
 * @param {string} profile
 * @returns {string[]}
 */
export function mapLegacyProfileToPacks(profile) {
  if (!profile || typeof profile !== 'string' || !LEGACY_PROFILE_MAP[profile]) {
    throw new Error(`Profil tidak valid: "${profile}". Pilihan: ${Object.keys(LEGACY_PROFILE_MAP).join(', ')}.`);
  }
  return [...LEGACY_PROFILE_MAP[profile]];
}

/**
 * Resolves requested pack IDs against a pack registry.
 *
 * @param {string[]} requestedIds - Array of pack IDs requested explicitly
 * @param {Map<string, Object>} [registry=PACK_REGISTRY] - Pack registry to resolve against
 * @returns {{
 *   requested: string[],
 *   dependencies: string[],
 *   resolved: string[],
 *   packs: Object[],
 *   assets: Object[],
 *   duplicates: { dest: string, contributedBy: string[] }[]
 * }}
 */
export function resolvePacks(requestedIds, registry = PACK_REGISTRY) {
  if (!Array.isArray(requestedIds) || requestedIds.length === 0) {
    throw new Error('At least one pack ID must be specified for resolution.');
  }

  // 1. Validate requested pack IDs
  const requestedSet = new Set();
  for (const id of requestedIds) {
    if (!isValidPackId(id)) {
      throw new Error(`Pack ID tidak valid: "${id}".`);
    }
    if (!registry.has(id)) {
      throw new Error(`Pack tidak dikenal: "${id}".`);
    }
    requestedSet.add(id);
  }

  // 2. Transitive dependency resolution with cycle and missing dependency detection
  const resolvedMap = new Map();
  const visiting = new Set();

  function visit(packId, chain = []) {
    if (visiting.has(packId)) {
      throw new Error(`Deteksi siklus dependensi: ${chain.concat(packId).join(' -> ')}`);
    }
    if (resolvedMap.has(packId)) {
      return;
    }

    const pack = registry.get(packId);
    if (!pack) {
      throw new Error(`Dependensi tidak ditemukan: "${packId}" dibutuhkan oleh "${chain[chain.length - 1]}".`);
    }

    visiting.add(packId);
    const nextChain = [...chain, packId];

    if (Array.isArray(pack.dependencies)) {
      for (const depId of pack.dependencies) {
        visit(depId, nextChain);
      }
    }

    visiting.delete(packId);
    resolvedMap.set(packId, pack);
  }

  for (const id of requestedIds) {
    visit(id);
  }

  const resolvedPacks = Array.from(resolvedMap.values());
  const resolvedPackIds = Array.from(resolvedMap.keys());

  // 3. Distinguish requested packs from automatically included dependencies
  const dependencies = resolvedPackIds.filter(id => !requestedSet.has(id));
  const requested = resolvedPackIds.filter(id => requestedSet.has(id));

  // 4. Conflict detection
  for (const pack of resolvedPacks) {
    if (Array.isArray(pack.conflicts)) {
      for (const conflictId of pack.conflicts) {
        if (resolvedMap.has(conflictId)) {
          throw new Error(`Konflik pack terdeteksi: "${pack.id}" tidak kompatibel dengan "${conflictId}".`);
        }
      }
    }
  }

// 5. Asset collection and duplicate asset detection
  const assetDestinationMap = new Map();
  const duplicates = [];

  for (const pack of resolvedPacks) {
    for (const asset of pack.assets) {
      const destKey = asset.dest;
      if (!assetDestinationMap.has(destKey)) {
        assetDestinationMap.set(destKey, {
          asset,
          contributedBy: [pack.id]
        });
      } else {
        const existing = assetDestinationMap.get(destKey);
        let isIdentical = existing.asset.src === asset.src;

        if (!isIdentical) {
          if (existing.asset.content !== undefined && asset.content !== undefined) {
            isIdentical = existing.asset.content === asset.content;
          } else if (options.rootDir) {
            const io = options.io || fs;
            const path1 = path.resolve(options.rootDir, existing.asset.src);
            const path2 = path.resolve(options.rootDir, asset.src);
            if (io.existsSync(path1) && io.existsSync(path2)) {
              isIdentical = Buffer.compare(io.readFileSync(path1), io.readFileSync(path2)) === 0;
            }
          }
        }

        if (!isIdentical) {
          throw new Error(
            `Konflik aset terdeteksi pada destination "${destKey}": ` +
            `pack "${existing.contributedBy[0]}" (src: "${existing.asset.src}") dan ` +
            `pack "${pack.id}" (src: "${asset.src}") menyediakan konten yang berbeda.`
          );
        }

        existing.contributedBy.push(pack.id);
      }
    }
  }

  const assets = [];
  for (const [dest, entry] of assetDestinationMap.entries()) {
    assets.push(entry.asset);
    if (entry.contributedBy.length > 1) {
      duplicates.push({
        dest,
        contributedBy: entry.contributedBy
      });
    }
  }

  return {
    requested,
    dependencies,
    resolved: resolvedPackIds,
    packs: resolvedPacks,
    assets,
    duplicates
  };
}

/**
 * Translates resolved packs into concrete file source/destination objects for installation.
 * Verifies that duplicate asset destinations have identical content and rejects collisions.
 *
 * @param {Object[]} packs - Resolved pack definitions
 * @param {'workspace' | 'global'} scope
 * @param {string} target - Absolute path to target directory
 * @param {string} rootDir - Absolute path to vibe-kit package root
 * @param {Object} [io=fs] - Filesystem abstraction
 * @returns {{ src: string, dest: string, type: string, packId: string, relPath: string }[]}
 */
export function resolvePackFiles(packs, scope, target, rootDir, io = fs) {
  const fileMap = new Map();

  for (const pack of packs) {
    for (const asset of pack.assets) {
      // Omit templates in global scope
      if (scope === 'global' && asset.type === 'template') {
        continue;
      }

      let destPath;
      let srcPath = path.resolve(rootDir, asset.src);

      if (scope === 'workspace') {
        if (asset.type === 'skill' || asset.type === 'rule') {
          destPath = path.resolve(target, '.agents', asset.dest);
        } else {
          // Templates are placed target-root relative (e.g. docs/ai-workflow/...)
          destPath = path.resolve(target, asset.dest);
        }
      } else {
        // Global scope
        if (asset.type === 'rule') {
          srcPath = path.resolve(rootDir, 'rules', 'global', 'engineering-standards.md');
          destPath = path.resolve(target, 'rules', 'vibe-kit-engineering-standards.md');
        } else {
          destPath = path.resolve(target, asset.dest);
        }
      }

      const relPath = path.relative(target, destPath).split(path.sep).join('/');
      if (!fileMap.has(relPath)) {
        fileMap.set(relPath, {
          src: srcPath,
          dest: destPath,
          type: asset.type,
          packId: pack.id,
          relPath
        });
      } else {
        const existing = fileMap.get(relPath);
        let isIdentical = existing.src === srcPath;

        if (!isIdentical) {
          if (asset.content !== undefined && existing.content !== undefined) {
            isIdentical = asset.content === existing.content;
          } else if (io.existsSync(existing.src) && io.existsSync(srcPath)) {
            isIdentical = Buffer.compare(io.readFileSync(existing.src), io.readFileSync(srcPath)) === 0;
          }
        }

        if (!isIdentical) {
          throw new Error(
            `Konflik aset terdeteksi pada "${relPath}": ` +
            `pack "${existing.packId}" dan pack "${pack.id}" menyediakan konten yang berbeda.`
          );
        }
      }
    }
  }

  return Array.from(fileMap.values());
}

/**
 * Generates a preview of the resolution and intended filesystem actions without
 * modifying any project files or creating manifests.
 *
 * Validates path security invariants (path containment & symlink escaping)
 * and accurately classifies actions as CREATE, IDENTICAL, or CONFLICT.
 *
 * @param {Object} resolution - Result from resolvePacks()
 * @param {'workspace' | 'global'} scope
 * @param {string} target - Target directory path
 * @param {string} rootDir - Package root path
 * @param {Object} [io=fs] - Filesystem abstraction for read-only inspection
 * @param {Object} [opts={}] - Options (e.g. conflict policy, yes)
 * @returns {Object} Structured preview report
 */
export function previewResolution(resolution, scope, target, rootDir, io = fs, opts = {}) {
  const files = resolvePackFiles(resolution.packs, scope, target, rootDir, io);

  for (const f of files) {
    if (!io.existsSync(f.src)) {
      throw new Error(`Asset toolkit hilang atau tidak ditemukan: ${f.src}. Instalasi dibatalkan sebelum menulis file apa pun.`);
    }
    if (!isStrictlyInside(f.dest, target, io)) {
      throw new Error(`Path tujuan tidak aman di luar folder target: ${f.dest}. Instalasi dibatalkan.`);
    }
  }

  const packContributions = resolution.packs.map(p => ({
    packId: p.id,
    type: p.type,
    name: p.name,
    assetCount: p.assets.length,
    assets: p.assets.map(a => a.dest)
  }));

  const fileActions = files.map(f => {
    const exists = io.existsSync(f.dest);
    if (!exists) {
      return {
        action: 'CREATE',
        policyAction: 'CREATE',
        relPath: f.relPath,
        packId: f.packId,
        type: f.type,
        dest: f.dest
      };
    }

    const srcHash = computeFileHash(f.src, io);
    const diskHash = computeFileHash(f.dest, io);

    if (srcHash && diskHash && srcHash === diskHash) {
      return {
        action: 'IDENTICAL',
        policyAction: 'UNCHANGED',
        relPath: f.relPath,
        packId: f.packId,
        type: f.type,
        dest: f.dest
      };
    }

    let policyAction = 'PROMPT USER';
    if (opts.conflict === 'replace') {
      policyAction = 'REPLACE';
    } else if (opts.conflict === 'skip') {
      policyAction = 'SKIP';
    } else if (opts.conflict === 'keep') {
      policyAction = 'KEEP';
    } else if (opts.yes) {
      policyAction = 'KEEP (DEFAULT)';
    }

    return {
      action: 'CONFLICT',
      policyAction,
      relPath: f.relPath,
      packId: f.packId,
      type: f.type,
      dest: f.dest
    };
  });

  return {
    requested: resolution.requested,
    dependencies: resolution.dependencies,
    resolvedPacks: resolution.resolved,
    packContributions,
    duplicates: resolution.duplicates,
    fileActions
  };
}
