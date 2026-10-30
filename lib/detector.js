/**
 * Project Stack Detector for Vibe Kit (Phase 2)
 *
 * Deterministically detects technologies from repository evidence (manifests, configs, lockfiles).
 * Safe, read-only, non-recursive beyond bounded monorepo depths, and protects sensitive files.
 */

import path from 'node:path';
import fs from 'node:fs';

export const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'vendor',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'out',
  'coverage',
  '.cache',
  '.turbo',
  '.agents',
  '.gemini',
  'tmp',
  'temp'
]);

/**
 * Safely parses a JSON file using the provided filesystem abstraction.
 * Returns null if file does not exist, cannot be read, or contains invalid JSON.
 *
 * @param {string} filePath
 * @param {Object} [io=fs]
 * @returns {Object|null}
 */
export function safeReadJson(filePath, io = fs) {
  try {
    if (!io.existsSync(filePath)) return null;
    const content = io.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Safely reads a text file using the provided filesystem abstraction.
 * Returns null if file does not exist or cannot be read.
 *
 * @param {string} filePath
 * @param {Object} [io=fs]
 * @returns {string|null}
 */
export function safeReadText(filePath, io = fs) {
  try {
    if (!io.existsSync(filePath)) return null;
    return io.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Checks if a path exists.
 *
 * @param {string} filePath
 * @param {Object} [io=fs]
 * @returns {boolean}
 */
export function safeExists(filePath, io = fs) {
  try {
    return io.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Detects technologies in a single directory (root or monorepo package).
 *
 * @param {string} dir - Directory to inspect
 * @param {string} relDir - Relative directory for evidence reporting (e.g. '.' or 'packages/web')
 * @param {Object} [io=fs]
 * @returns {Object[]} Array of detected technology facts
 */
export function detectDirectoryTechnologies(dir, relDir = '.', io = fs) {
  const technologies = [];

  function addTech(id, name, category, confidence, evidence) {
    technologies.push({
      id,
      name,
      category,
      confidence, // 'high' | 'medium' | 'low'
      evidence: evidence.map(e => ({
        ...e,
        file: relDir === '.' ? e.file : path.posix.join(relDir.split(path.sep).join('/'), e.file)
      })),
      path: relDir.split(path.sep).join('/')
    });
  }

  // 1. Package Managers & Lockfiles
  const pkgLockPath = path.join(dir, 'package-lock.json');
  const yarnLockPath = path.join(dir, 'yarn.lock');
  const pnpmLockPath = path.join(dir, 'pnpm-lock.yaml');
  const bunLockPath = path.join(dir, 'bun.lockb');
  const bunTextLockPath = path.join(dir, 'bun.lock');

  if (safeExists(pnpmLockPath, io)) {
    addTech('pnpm', 'pnpm', 'package-manager', 'high', [
      { file: 'pnpm-lock.yaml', method: 'lockfile', detail: 'pnpm lockfile found' }
    ]);
  } else if (safeExists(yarnLockPath, io)) {
    addTech('yarn', 'Yarn', 'package-manager', 'high', [
      { file: 'yarn.lock', method: 'lockfile', detail: 'Yarn lockfile found' }
    ]);
  } else if (safeExists(bunLockPath, io) || safeExists(bunTextLockPath, io)) {
    addTech('bun', 'Bun', 'package-manager', 'high', [
      { file: safeExists(bunLockPath, io) ? 'bun.lockb' : 'bun.lock', method: 'lockfile', detail: 'Bun lockfile found' }
    ]);
  } else if (safeExists(pkgLockPath, io)) {
    addTech('npm', 'npm', 'package-manager', 'high', [
      { file: 'package-lock.json', method: 'lockfile', detail: 'npm lockfile found' }
    ]);
  }

  // 2. Node.js & Dependencies
  const pkgPath = path.join(dir, 'package.json');
  const pkg = safeReadJson(pkgPath, io);

  if (pkg && typeof pkg === 'object') {
    addTech('nodejs', 'Node.js', 'runtime', 'high', [
      { file: 'package.json', method: 'file-existence', detail: `Package "${pkg.name || 'unnamed'}"` }
    ]);

    const deps = pkg.dependencies && typeof pkg.dependencies === 'object' ? pkg.dependencies : {};
    const devDeps = pkg.devDependencies && typeof pkg.devDependencies === 'object' ? pkg.devDependencies : {};

    // Helper to check dependencies
    function checkDep(name, onFound) {
      if (deps[name]) {
        onFound('high', deps[name], 'dependency');
      } else if (devDeps[name]) {
        onFound('medium', devDeps[name], 'devDependency');
      }
    }

    // Frontend Frameworks
    checkDep('react', (conf, ver, method) => {
      addTech('react', 'React', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"react": "${ver}"` }
      ]);
    });

    checkDep('next', (conf, ver, method) => {
      addTech('next', 'Next.js', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"next": "${ver}"` }
      ]);
    });

    checkDep('vue', (conf, ver, method) => {
      addTech('vue', 'Vue', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"vue": "${ver}"` }
      ]);
    });

    checkDep('nuxt', (conf, ver, method) => {
      addTech('nuxt', 'Nuxt', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"nuxt": "${ver}"` }
      ]);
    });

    checkDep('svelte', (conf, ver, method) => {
      addTech('svelte', 'Svelte', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"svelte": "${ver}"` }
      ]);
    });

    checkDep('vite', (conf, ver, method) => {
      addTech('vite', 'Vite', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"vite": "${ver}"` }
      ]);
    });

    checkDep('astro', (conf, ver, method) => {
      addTech('astro', 'Astro', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"astro": "${ver}"` }
      ]);
    });

    checkDep('@angular/core', (conf, ver, method) => {
      addTech('angular', 'Angular', 'frontend-framework', conf, [
        { file: 'package.json', method, detail: `"@angular/core": "${ver}"` }
      ]);
    });

    // Backend Frameworks
    checkDep('express', (conf, ver, method) => {
      addTech('express', 'Express', 'backend-framework', conf, [
        { file: 'package.json', method, detail: `"express": "${ver}"` }
      ]);
    });

    checkDep('fastify', (conf, ver, method) => {
      addTech('fastify', 'Fastify', 'backend-framework', conf, [
        { file: 'package.json', method, detail: `"fastify": "${ver}"` }
      ]);
    });

    checkDep('@nestjs/core', (conf, ver, method) => {
      addTech('nestjs', 'NestJS', 'backend-framework', conf, [
        { file: 'package.json', method, detail: `"@nestjs/core": "${ver}"` }
      ]);
    });

    checkDep('koa', (conf, ver, method) => {
      addTech('koa', 'Koa', 'backend-framework', conf, [
        { file: 'package.json', method, detail: `"koa": "${ver}"` }
      ]);
    });

    // Databases & Services
    checkDep('pg', (conf, ver, method) => {
      addTech('postgresql', 'PostgreSQL', 'database', conf, [
        { file: 'package.json', method, detail: `"pg": "${ver}"` }
      ]);
    });

    checkDep('postgres', (conf, ver, method) => {
      addTech('postgresql', 'PostgreSQL', 'database', conf, [
        { file: 'package.json', method, detail: `"postgres": "${ver}"` }
      ]);
    });

    checkDep('firebase', (conf, ver, method) => {
      addTech('firebase', 'Firebase', 'cloud-service', conf, [
        { file: 'package.json', method, detail: `"firebase": "${ver}"` }
      ]);
    });

    checkDep('firebase-admin', (conf, ver, method) => {
      addTech('firebase', 'Firebase', 'cloud-service', conf, [
        { file: 'package.json', method, detail: `"firebase-admin": "${ver}"` }
      ]);
    });
  }

  // 3. TypeScript
  const tsconfigPath = path.join(dir, 'tsconfig.json');
  if (safeExists(tsconfigPath, io)) {
    addTech('typescript', 'TypeScript', 'language', 'high', [
      { file: 'tsconfig.json', method: 'file-existence', detail: 'TypeScript config found' }
    ]);
  } else if (pkg && (pkg.devDependencies?.typescript || pkg.dependencies?.typescript)) {
    const isDev = Boolean(pkg.devDependencies?.typescript && !pkg.dependencies?.typescript);
    addTech('typescript', 'TypeScript', 'language', 'medium', [
      { file: 'package.json', method: isDev ? 'devDependency' : 'dependency', detail: 'typescript package in dependencies' }
    ]);
  }

  // 4. Flutter / Dart
  const pubspecPath = path.join(dir, 'pubspec.yaml');
  if (safeExists(pubspecPath, io)) {
    const pubspecText = safeReadText(pubspecPath, io) || '';
    const isFlutter = pubspecText.includes('flutter:');
    addTech('dart', 'Dart', 'language', 'high', [
      { file: 'pubspec.yaml', method: 'file-existence', detail: 'pubspec.yaml found' }
    ]);
    if (isFlutter) {
      addTech('flutter', 'Flutter', 'frontend-framework', 'high', [
        { file: 'pubspec.yaml', method: 'config-content', detail: 'flutter SDK declared' }
      ]);
    }
    if (/firebase_core|cloud_firestore|firebase_auth|firebase_storage/i.test(pubspecText)) {
      if (!technologies.some(t => t.id === 'firebase')) {
        addTech('firebase', 'Firebase', 'cloud-service', 'high', [
          { file: 'pubspec.yaml', method: 'config-content', detail: 'Firebase package declared in pubspec.yaml' }
        ]);
      }
    }
  }

  // 5. Python (pyproject.toml, requirements.txt, Pipfile)
  const pyprojectPath = path.join(dir, 'pyproject.toml');
  const reqsPath = path.join(dir, 'requirements.txt');
  const pipfilePath = path.join(dir, 'Pipfile');

  if (safeExists(pyprojectPath, io)) {
    addTech('python', 'Python', 'language', 'high', [
      { file: 'pyproject.toml', method: 'file-existence', detail: 'pyproject.toml found' }
    ]);
    const pyprojectText = safeReadText(pyprojectPath, io) || '';
    if (pyprojectText.includes('django') || pyprojectText.includes('Django')) {
      addTech('django', 'Django', 'backend-framework', 'high', [
        { file: 'pyproject.toml', method: 'config-content', detail: 'django declared' }
      ]);
    }
    if (pyprojectText.includes('fastapi') || pyprojectText.includes('FastAPI')) {
      addTech('fastapi', 'FastAPI', 'backend-framework', 'high', [
        { file: 'pyproject.toml', method: 'config-content', detail: 'fastapi declared' }
      ]);
    }
    if (pyprojectText.includes('flask') || pyprojectText.includes('Flask')) {
      addTech('flask', 'Flask', 'backend-framework', 'high', [
        { file: 'pyproject.toml', method: 'config-content', detail: 'flask declared' }
      ]);
    }
  } else if (safeExists(reqsPath, io)) {
    addTech('python', 'Python', 'language', 'high', [
      { file: 'requirements.txt', method: 'file-existence', detail: 'requirements.txt found' }
    ]);
    const reqsText = safeReadText(reqsPath, io) || '';
    if (/^django([=><]|$)/im.test(reqsText)) {
      addTech('django', 'Django', 'backend-framework', 'high', [
        { file: 'requirements.txt', method: 'config-content', detail: 'django requirement' }
      ]);
    }
    if (/^fastapi([=><]|$)/im.test(reqsText)) {
      addTech('fastapi', 'FastAPI', 'backend-framework', 'high', [
        { file: 'requirements.txt', method: 'config-content', detail: 'fastapi requirement' }
      ]);
    }
    if (/^flask([=><]|$)/im.test(reqsText)) {
      addTech('flask', 'Flask', 'backend-framework', 'high', [
        { file: 'requirements.txt', method: 'config-content', detail: 'flask requirement' }
      ]);
    }
    if (/^(psycopg2(-binary)?|psycopg|asyncpg)([=><]|$)/im.test(reqsText)) {
      if (!technologies.some(t => t.id === 'postgresql')) {
        addTech('postgresql', 'PostgreSQL', 'database', 'high', [
          { file: 'requirements.txt', method: 'config-content', detail: 'PostgreSQL driver requirement' }
        ]);
      }
    }
    if (/^firebase-admin([=><]|$)/im.test(reqsText)) {
      if (!technologies.some(t => t.id === 'firebase')) {
        addTech('firebase', 'Firebase', 'cloud-service', 'high', [
          { file: 'requirements.txt', method: 'config-content', detail: 'firebase-admin requirement' }
        ]);
      }
    }
  } else if (safeExists(pipfilePath, io)) {
    addTech('python', 'Python', 'language', 'high', [
      { file: 'Pipfile', method: 'file-existence', detail: 'Pipfile found' }
    ]);
  }

  // 6. Prisma / PostgreSQL
  const prismaSchemaPath = path.join(dir, 'prisma', 'schema.prisma');
  if (safeExists(prismaSchemaPath, io)) {
    const prismaText = safeReadText(prismaSchemaPath, io) || '';
    if (/provider\s*=\s*["']postgresql["']/i.test(prismaText)) {
      // Avoid duplicate if pg already detected
      if (!technologies.some(t => t.id === 'postgresql')) {
        addTech('postgresql', 'PostgreSQL', 'database', 'high', [
          { file: 'prisma/schema.prisma', method: 'config-content', detail: 'provider = "postgresql"' }
        ]);
      }
    }
  }

  // 7. Firebase Configs & Rules
  const firebaseJsonPath = path.join(dir, 'firebase.json');
  const firebasercPath = path.join(dir, '.firebaserc');
  const firestoreRulesPath = path.join(dir, 'firestore.rules');
  if (safeExists(firebaseJsonPath, io)) {
    if (!technologies.some(t => t.id === 'firebase')) {
      addTech('firebase', 'Firebase', 'cloud-service', 'high', [
        { file: 'firebase.json', method: 'file-existence', detail: 'firebase.json found' }
      ]);
    }
  } else if (safeExists(firebasercPath, io)) {
    if (!technologies.some(t => t.id === 'firebase')) {
      addTech('firebase', 'Firebase', 'cloud-service', 'high', [
        { file: '.firebaserc', method: 'file-existence', detail: '.firebaserc found' }
      ]);
    }
  } else if (safeExists(firestoreRulesPath, io)) {
    if (!technologies.some(t => t.id === 'firebase')) {
      addTech('firebase', 'Firebase', 'cloud-service', 'high', [
        { file: 'firestore.rules', method: 'file-existence', detail: 'firestore.rules found' }
      ]);
    }
  }

  return technologies;
}

/**
 * Detects whether the repository has a monorepo structure.
 *
 * @param {string} rootDir
 * @param {Object} [io=fs]
 * @returns {{ isMonorepo: boolean, type?: string, workspaces: string[] }}
 */
export function detectMonorepo(rootDir, io = fs) {
  // Check pnpm-workspace.yaml
  const pnpmWorkspace = path.join(rootDir, 'pnpm-workspace.yaml');
  if (safeExists(pnpmWorkspace, io)) {
    return { isMonorepo: true, type: 'pnpm', workspaces: ['packages/*', 'apps/*'] };
  }

  // Check package.json workspaces
  const pkg = safeReadJson(path.join(rootDir, 'package.json'), io);
  if (pkg && pkg.workspaces) {
    const list = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : Array.isArray(pkg.workspaces.packages)
        ? pkg.workspaces.packages
        : [];
    return { isMonorepo: true, type: 'npm-yarn', workspaces: list };
  }

  // Check lerna.json
  if (safeExists(path.join(rootDir, 'lerna.json'), io)) {
    return { isMonorepo: true, type: 'lerna', workspaces: ['packages/*'] };
  }

  // Check subdirectories named 'packages', 'apps', or 'services'
  const hasPackagesDir = safeExists(path.join(rootDir, 'packages'), io);
  const hasAppsDir = safeExists(path.join(rootDir, 'apps'), io);
  const hasServicesDir = safeExists(path.join(rootDir, 'services'), io);
  if (hasPackagesDir || hasAppsDir || hasServicesDir) {
    const workspaces = [];
    if (hasPackagesDir) workspaces.push('packages/*');
    if (hasAppsDir) workspaces.push('apps/*');
    if (hasServicesDir) workspaces.push('services/*');
    return { isMonorepo: true, type: 'directory', workspaces };
  }

  return { isMonorepo: false, workspaces: [] };
}

/**
 * Performs complete, safe project stack detection on the target repository.
 *
 * @param {string} targetDir - Absolute path to target workspace
 * @param {Object} [io=fs] - Filesystem abstraction
 * @returns {{
 *   technologies: Object[],
 *   monorepo: { isMonorepo: boolean, type?: string, packages: Object[] },
 *   detectedAt: string
 * }}
 */
export function detectProject(targetDir, io = fs) {
  const rootTechnologies = detectDirectoryTechnologies(targetDir, '.', io);
  const monorepoInfo = detectMonorepo(targetDir, io);
  const subPackages = [];

  // If monorepo, inspect 1-level deep in configured workspace parents (packages/, apps/, services/, etc.)
  if (monorepoInfo.isMonorepo) {
    const candidateParents = new Set(['packages', 'apps', 'services']);
    if (Array.isArray(monorepoInfo.workspaces)) {
      for (const pattern of monorepoInfo.workspaces) {
        const first = pattern.split('/')[0];
        if (first && !first.includes('*')) {
          candidateParents.add(first);
        }
      }
    }
    for (const parent of candidateParents) {
      const parentDir = path.join(targetDir, parent);
      if (safeExists(parentDir, io)) {
        try {
          const entries = io.readdirSync(parentDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
              const subDir = path.join(parentDir, entry.name);
              const relDir = path.posix.join(parent, entry.name);
              const subTechs = detectDirectoryTechnologies(subDir, relDir, io);
              if (subTechs.length > 0) {
                subPackages.push({
                  name: entry.name,
                  path: relDir,
                  technologies: subTechs,
                  recommendedPacks: recommendPacksFromTech(subTechs)
                });
              }
            }
          }
        } catch {
          // Gracefully continue on read errors
        }
      }
    }
  }

  // Aggregate all technologies, deduplicating by ID while preserving specific evidence
  const techMap = new Map();

  for (const t of rootTechnologies) {
    techMap.set(t.id, { ...t });
  }

  for (const pkg of subPackages) {
    for (const t of pkg.technologies) {
      if (!techMap.has(t.id)) {
        techMap.set(t.id, { ...t });
      } else {
        const existing = techMap.get(t.id);
        existing.evidence.push(...t.evidence);
      }
    }
  }

  return {
    technologies: Array.from(techMap.values()),
    monorepo: {
      isMonorepo: monorepoInfo.isMonorepo,
      type: monorepoInfo.type,
      packages: subPackages
    },
    detectedAt: new Date().toISOString()
  };
}

/**
 * Recommends packs based on detected technologies.
 * Only maps to packs currently supported in the catalog.
 *
 * @param {Object[]} technologies
 * @returns {string[]} Array of recommended pack IDs
 */
export function recommendPacksFromTech(technologies) {
  const recommended = new Set();
  const techIds = new Set(technologies.map(t => t.id));

  const hasFrontend = [
    'react', 'vue', 'svelte', 'next', 'nuxt', 'vite', 'astro', 'angular', 'flutter'
  ].some(id => techIds.has(id));

  const hasBackend = [
    'express', 'fastify', 'nestjs', 'koa', 'django', 'flask', 'fastapi'
  ].some(id => techIds.has(id));

  if (hasFrontend && hasBackend) {
    recommended.add('role:fullstack');
  } else if (hasFrontend) {
    recommended.add('role:frontend');
  } else if (hasBackend) {
    recommended.add('role:backend');
  } else {
    // If no specific role stack is recognized, recommend core foundational pack
    recommended.add('core');
  }

  return Array.from(recommended);
}
