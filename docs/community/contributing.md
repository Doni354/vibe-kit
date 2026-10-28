# Contributing & Releases

Thank you for your interest in contributing to Vibe Kit! This guide covers our local development setup, testing standards, packaging checks, and release practices.

---

## Repository & Links

- **GitHub Repository**: [https://github.com/doni354/vibe-kit](https://github.com/doni354/vibe-kit)
- **npm Package**: [@doni354/vibe-kit](https://www.npmjs.com/package/@doni354/vibe-kit)
- **Issues & Discussions**: [https://github.com/doni354/vibe-kit/issues](https://github.com/doni354/vibe-kit/issues)

---

## Local Development Setup

### 1. Prerequisites
- **Node.js**: `>= 18.0.0` (LTS recommended)
- **Git**
- **npm**: `>= 9.0.0`

### 2. Clone and Install

```bash
git clone https://github.com/doni354/vibe-kit.git
cd vibe-kit

# Install development dependencies (VitePress for docs)
npm install
```

### 3. Running the Local CLI
You can test the CLI directly using the local entry point:

```bash
node ./bin/vibe-kit.js --help
node ./bin/vibe-kit.js doctor
```

---

## Automated Test Suite

Vibe Kit uses Node.js's native test runner (`node:test` and `node:assert/strict`) with **zero third-party test dependencies** for maximum reproducibility and speed.

Run all tests:

```bash
npm test
```

### What the Test Suite Verifies (43 Tests):
1. **Structural Asset Integrity (`test/assets.test.js`)**:
   - Every skill has valid YAML frontmatter (`name`, `description`) matching its directory name.
   - Rules feature `trigger: always_on` and comprehensive engineering guidelines.
   - Living templates in `templates/docs/` contain clean placeholders without hardcoded developer paths or credentials.
   - The root README accurately documents all commands and options.
2. **CLI Commands & Argument Parsing (`test/cli.test.js`)**:
   - Flags with `--flag=value` and `--flag value` syntax.
   - Rejection of unknown flags and invalid scope/profile/conflict options.
   - Profile merging during re-installation.
   - Pre-flight checks aborting before modifying disk if assets are missing.
   - User-modified file protection during `uninstall` and `update`.
   - Empty parent directory cleanup without traversing external paths.
3. **Deterministic Fault Injection & Rollback**:
   - Injects mock I/O errors via filesystem dependency injection (`opts.fs`).
   - Verifies that overwritten files (`UPDATE`) and conflict replacements (`replace`) are restored to exact pre-operation contents.
   - Confirms user backups are preserved and temporary snapshots (`.vibe-rollback-*`) are cleaned up.
4. **Symbolic-Link Escape Prevention**:
   - Creates temporary directory symlinks and asserts that `init`, `update`, `uninstall`, and `doctor` reject operations that escape the target workspace.

---

## Documentation Website Development

The documentation site is built using [VitePress](https://vitepress.dev):

```bash
# Start local documentation dev server (hot reload)
npm run docs:dev

# Build static production assets
npm run docs:build

# Preview the production build locally
npm run docs:preview
```

The build output is generated in `docs/.vitepress/dist` and is automatically deployed to GitHub Pages via GitHub Actions.

---

## Package Integrity Verification

Before proposing changes, verify that the npm package bundle is clean and does not leak test files, documentation source, or temporary artifacts:

```bash
npm pack --dry-run
```

**Expected Package Contents (20 files):**
- `bin/vibe-kit.js`
- `lib/cli.js`
- `package.json`
- `README.md`, `LICENSE`, `CHANGELOG.md`
- `rules/` (workspace and global engineering standards)
- `skills/` (5 specialized skills)
- `templates/` (7 living documentation templates)

---

## Release Guidelines

1. **Version Governance**: Versions follow [Semantic Versioning](https://semver.org/). Version numbers are updated in `package.json` only upon official release decisions.
2. **Commit Hygiene**: Commits should be focused, atomic, and descriptive.
3. **No Breaking Changes to Manifest**: Backward compatibility with existing user manifests (`.vibe-kit-manifest.json`) must be preserved.

---

## License

Vibe Kit is licensed under the [MIT License](https://github.com/doni354/vibe-kit/blob/main/LICENSE).

```text
MIT License

Copyright (c) 2026 doni354

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so...
```
