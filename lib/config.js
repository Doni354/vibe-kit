/**
 * Persistent Project Configuration Management for Vibe Kit (Phase 2)
 *
 * Manages `.vibe-kit.json`:
 * - Clear separation between detected facts, user overrides, and resolved configuration.
 * - Re-detection preserves user overrides.
 * - Schema versioned (version: 1).
 * - Safe read/write without secrets.
 */

import path from 'node:path';
import fs from 'node:fs';
import { detectProject, recommendPacksFromTech } from './detector.js';
import { isValidPackId } from './pack-contract.js';

export const CONFIG_FILE = '.vibe-kit.json';
export const CONFIG_SCHEMA_VERSION = 1;

/**
 * Validates the structure and version of a configuration object.
 * Throws actionable errors on malformed configs.
 *
 * @param {Object} config
 * @returns {boolean}
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Konfigurasi tidak valid: harus berupa objek JSON non-null.');
  }

  if (config.version !== CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `Versi skema konfigurasi tidak didukung: ${config.version}. ` +
      `Versi yang didukung saat ini: ${CONFIG_SCHEMA_VERSION}.`
    );
  }

  if (config.overrides !== undefined) {
    if (typeof config.overrides !== 'object' || Array.isArray(config.overrides)) {
      throw new Error('Format "overrides" pada konfigurasi tidak valid: harus berupa objek.');
    }
    if (config.overrides.enabled !== undefined) {
      if (!Array.isArray(config.overrides.enabled) || !config.overrides.enabled.every(x => typeof x === 'string')) {
        throw new Error('"overrides.enabled" harus berupa array string ID teknologi.');
      }
    }
    if (config.overrides.disabled !== undefined) {
      if (!Array.isArray(config.overrides.disabled) || !config.overrides.disabled.every(x => typeof x === 'string')) {
        throw new Error('"overrides.disabled" harus berupa array string ID teknologi.');
      }
    }
    if (config.overrides.packs !== undefined) {
      if (!Array.isArray(config.overrides.packs) || !config.overrides.packs.every(x => typeof x === 'string' && isValidPackId(x))) {
        throw new Error('"overrides.packs" harus berupa array string ID pack yang valid (contoh: "role:frontend").');
      }
    }

    // Safety conflict check: same technology cannot be in both enabled and disabled
    if (config.overrides.enabled && config.overrides.disabled) {
      const enabledSet = new Set(config.overrides.enabled);
      for (const d of config.overrides.disabled) {
        if (enabledSet.has(d)) {
          throw new Error(
            `Konflik override pada konfigurasi: teknologi "${d}" tidak boleh ada di "overrides.enabled" dan "overrides.disabled" secara bersamaan.`
          );
        }
      }
    }
  }

  return true;
}

/**
 * Computes resolved configuration from detected facts and user overrides.
 * Priority order:
 * 1. User overrides (enabled technologies forced in, disabled technologies excluded).
 * 2. Detected facts.
 * 3. Documented defaults.
 *
 * @param {Object} detected - Detected facts object
 * @param {Object} [overrides={}] - User overrides
 * @returns {Object} Resolved configuration
 */
export function computeResolvedConfig(detected, overrides = {}) {
  const disabledSet = new Set(overrides.disabled || []);
  const enabledSet = new Set(overrides.enabled || []);

  // Safety invariant: disabled strictly takes precedence over enabled in case of conflict
  for (const d of disabledSet) {
    enabledSet.delete(d);
  }

  const detectedTechs = detected?.technologies || [];
  const resolvedTechMap = new Map();

  // 1. Add detected technologies unless explicitly disabled by user
  for (const tech of detectedTechs) {
    if (!disabledSet.has(tech.id)) {
      resolvedTechMap.set(tech.id, {
        id: tech.id,
        name: tech.name,
        category: tech.category,
        source: 'detected',
        confidence: tech.confidence
      });
    }
  }

  // 2. Add user-enabled overrides
  for (const techId of enabledSet) {
    if (!resolvedTechMap.has(techId)) {
      resolvedTechMap.set(techId, {
        id: techId,
        name: techId,
        category: 'user-override',
        source: 'user-override',
        confidence: 'high'
      });
    }
  }

  const resolvedTechnologies = Array.from(resolvedTechMap.values());
  const recommendedPacks = recommendPacksFromTech(resolvedTechnologies);

  // Effective packs: if overrides explicitly define packs, use them; otherwise use recommended
  const effectivePacks = (Array.isArray(overrides.packs) && overrides.packs.length > 0)
    ? [...overrides.packs]
    : [...recommendedPacks];

  return {
    technologies: resolvedTechnologies,
    recommendedPacks,
    effectivePacks
  };
}

/**
 * Loads and validates `.vibe-kit.json` from the target workspace directory.
 * Returns null if file does not exist.
 *
 * @param {string} targetDir - Absolute path to workspace
 * @param {Object} [io=fs]
 * @returns {Object|null}
 */
export function loadProjectConfig(targetDir, io = fs) {
  const configPath = path.join(targetDir, CONFIG_FILE);
  if (!io.existsSync(configPath)) {
    return null;
  }

  let raw;
  try {
    raw = io.readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new Error(`Gagal membaca file konfigurasi "${configPath}": ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`File konfigurasi korup atau sintaks JSON tidak valid di "${configPath}": ${err.message}`);
  }

  validateConfig(parsed);
  return parsed;
}

/**
 * Saves project configuration safely to `.vibe-kit.json`.
 * Writes atomically via a temporary file and validates containment.
 *
 * @param {string} targetDir
 * @param {Object} configData
 * @param {Object} [io=fs]
 * @returns {string} Absolute path of written configuration file
 */
export function saveProjectConfig(targetDir, configData, io = fs) {
  validateConfig(configData);
  const resolvedTarget = path.resolve(targetDir);
  const configPath = path.resolve(targetDir, CONFIG_FILE);

  if (path.dirname(configPath) !== resolvedTarget) {
    throw new Error(`Path target file konfigurasi tidak aman: "${configPath}" berada di luar direktori target.`);
  }

  const content = JSON.stringify(configData, null, 2) + '\n';
  const tmpPath = path.join(resolvedTarget, `${CONFIG_FILE}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  try {
    io.writeFileSync(tmpPath, content, 'utf8');
    io.renameSync(tmpPath, configPath);
  } catch (err) {
    try {
      if (io.existsSync(tmpPath)) {
        io.unlinkSync(tmpPath);
      }
    } catch {}
    throw new Error(`Gagal menyimpan file konfigurasi di "${configPath}": ${err.message}`);
  }

  return configPath;
}

/**
 * Runs or refreshes project stack configuration.
 * If existing configuration exists, re-detection updates detected facts while
 * strictly preserving existing user overrides.
 *
 * @param {string} targetDir - Absolute path to workspace
 * @param {Object} [io=fs]
 * @param {Object} [options={}] - Options (e.g. override updates)
 * @returns {Object} Complete configuration object
 */
export function refreshProjectConfig(targetDir, io = fs, options = {}) {
  const existingConfig = loadProjectConfig(targetDir, io);

  // Preserve existing overrides, merging any new override options
  const overrides = {
    enabled: Array.from(new Set([
      ...(existingConfig?.overrides?.enabled || []),
      ...(options.enable || [])
    ])),
    disabled: Array.from(new Set([
      ...(existingConfig?.overrides?.disabled || []),
      ...(options.disable || [])
    ])),
    packs: options.packs !== undefined
      ? (Array.isArray(options.packs) ? [...options.packs] : [options.packs])
      : (existingConfig?.overrides?.packs ? [...existingConfig.overrides.packs] : [])
  };

  // If a tech was added to enable, remove it from disabled if present
  if (options.enable) {
    for (const t of options.enable) {
      overrides.disabled = overrides.disabled.filter(d => d !== t);
    }
  }

  // If a tech was added to disable, remove it from enabled if present
  if (options.disable) {
    for (const t of options.disable) {
      overrides.enabled = overrides.enabled.filter(e => e !== t);
    }
  }

  if (options.resetOverrides) {
    overrides.enabled = [];
    overrides.disabled = [];
    overrides.packs = [];
  }

  // 1. Detect facts from repository
  const detected = detectProject(targetDir, io);

  // 2. Compute resolved configuration
  const resolved = computeResolvedConfig(detected, overrides);

  return {
    $schema: 'https://vibe-kit.dev/schemas/config-v1.json',
    version: CONFIG_SCHEMA_VERSION,
    detected,
    overrides,
    resolved
  };
}
