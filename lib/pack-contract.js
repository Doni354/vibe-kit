/**
 * Pack Contract & Schema Validation for Vibe Kit (Phase 1)
 *
 * Defines the static contract for modular packs: core, role, engine, tech, and specialist.
 */

export const PACK_TYPES = Object.freeze([
  'core',
  'role',
  'engine',
  'tech',
  'specialist'
]);

export const ASSET_TYPES = Object.freeze([
  'skill',
  'rule',
  'template'
]);

/**
 * Validates a pack ID according to the naming convention:
 * - 'core' for the foundational core pack.
 * - '<type>:<name>' for all other packs (e.g. 'role:frontend', 'engine:remotion').
 * - Lowercase alphanumeric characters, colons, and hyphens only.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isValidPackId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return false;
  }
  return /^[a-z0-9]+([:-][a-z0-9]+)*$/.test(id);
}

/**
 * Validates a pack definition object against the pack contract.
 * Throws a descriptive Error if invalid.
 *
 * @param {Object} pack
 * @returns {boolean} true if valid
 */
export function validatePack(pack) {
  if (!pack || typeof pack !== 'object') {
    throw new Error('Pack definition must be a non-null object.');
  }

  if (typeof pack.id !== 'string' || !pack.id.trim()) {
    throw new Error('Pack "id" is required and must be a non-empty string.');
  }

  if (!isValidPackId(pack.id)) {
    throw new Error(`Pack id "${pack.id}" must be lowercase alphanumeric with hyphens or colons.`);
  }

  if (typeof pack.version !== 'string' || !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(pack.version)) {
    throw new Error(`Pack "${pack.id}" must have a valid semver version string.`);
  }

  if (!PACK_TYPES.includes(pack.type)) {
    throw new Error(`Pack "${pack.id}" has invalid type "${pack.type}". Allowed types: ${PACK_TYPES.join(', ')}.`);
  }

  if (typeof pack.name !== 'string' || !pack.name.trim()) {
    throw new Error(`Pack "${pack.id}" must have a non-empty display name.`);
  }

  if (typeof pack.description !== 'string' || !pack.description.trim()) {
    throw new Error(`Pack "${pack.id}" must have a non-empty description.`);
  }

  if (pack.dependencies !== undefined) {
    if (!Array.isArray(pack.dependencies) || !pack.dependencies.every(d => typeof d === 'string' && isValidPackId(d))) {
      throw new Error(`Pack "${pack.id}" dependencies must be an array of valid string pack IDs.`);
    }
  }

  if (pack.conflicts !== undefined) {
    if (!Array.isArray(pack.conflicts) || !pack.conflicts.every(c => typeof c === 'string' && isValidPackId(c))) {
      throw new Error(`Pack "${pack.id}" conflicts must be an array of valid string pack IDs.`);
    }
  }

  if (!Array.isArray(pack.assets)) {
    throw new Error(`Pack "${pack.id}" must have an "assets" array.`);
  }

  for (let i = 0; i < pack.assets.length; i++) {
    const asset = pack.assets[i];
    if (!asset || typeof asset !== 'object') {
      throw new Error(`Pack "${pack.id}" asset[${i}] must be an object.`);
    }
    if (!ASSET_TYPES.includes(asset.type)) {
      throw new Error(`Pack "${pack.id}" asset[${i}] has invalid type "${asset.type}". Allowed: ${ASSET_TYPES.join(', ')}.`);
    }
    if (typeof asset.src !== 'string' || !asset.src.trim()) {
      throw new Error(`Pack "${pack.id}" asset[${i}] must have a non-empty "src" path.`);
    }
    if (typeof asset.dest !== 'string' || !asset.dest.trim()) {
      throw new Error(`Pack "${pack.id}" asset[${i}] must have a non-empty "dest" path template.`);
    }
  }

  return true;
}
