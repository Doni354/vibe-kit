# Workflow & Safety Architecture

Deep dive into Vibe Kit's technical design, integrity guarantees, and filesystem security model.

---

## Architecture Overview

Vibe Kit operates on a three-tier architecture connecting the CLI toolkit to AI coding agents and human developers:

```
┌─────────────────────────────────────────────────────────────┐
│                 Vibe Kit CLI (lib/cli.js)                   │
│   • Path Traversal & Symlink Containment Engine             │
│   • Cryptographic SHA-256 Manifest Manager                  │
│   • Atomic Transactional Journal with Rollback Snapshots     │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ .agents/ Customization Root │ │    docs/ai-workflow/ Docs   │
│ • skills/*/SKILL.md         │ │ • PROJECT_CONTEXT.md        │
│ • rules/engineering-...md   │ │ • architecture.md, plan.md  │
└───────────────┬─────────────┘ └─────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│          Autonomous AI Coding Agents (Google Antigravity)   │
│   Reads always_on rules, applies specialized skills,        │
│   and synchronizes living documentation during development. │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation Scopes: Workspace vs Global

Vibe Kit supports two deployment scopes:

### 1. Workspace Scope (Default & Recommended)
- **Target**: The current repository root directory (`process.cwd()`).
- **Files Installed**:
  - `.agents/skills/<skill-name>/SKILL.md`
  - `.agents/rules/engineering-standards.md`
  - `docs/ai-workflow/*.md` (all 7 living templates)
  - `.vibe-kit-manifest.json`
- **Isolation**: Every project maintains its own isolated skills, living documentation, and version manifest. Team members checking out the repository inherit identical agent instructions.

### 2. Global Scope
- **Target**: User's home customization root (`~/.gemini/config` or `%USERPROFILE%\.gemini\config`).
- **Files Installed**:
  - `skills/<skill-name>/SKILL.md`
  - `rules/vibe-kit-engineering-standards.md`
  - `vibe-kit-global-manifest.json`
- **Isolation**: Applies across all projects opened by the user in Google Antigravity. Templates are omitted in global scope because architecture documents belong within individual project repositories.

---

## Cryptographic Manifest Tracking

When files are installed, Vibe Kit writes a JSON manifest (`.vibe-kit-manifest.json`):

```json
{
  "toolkit": "@doni354/vibe-kit",
  "version": "0.1.0",
  "scope": "workspace",
  "profile": "fullstack",
  "installedAt": "2026-10-28T05:00:00.000Z",
  "updatedAt": "2026-10-28T05:00:00.000Z",
  "paths": [
    ".agents/rules/engineering-standards.md",
    ".agents/skills/project-onboarding/SKILL.md",
    "docs/ai-workflow/PROJECT_CONTEXT.md"
  ],
  "files": {
    ".agents/rules/engineering-standards.md": {
      "hash": "sha256:4a3b8...",
      "installedAt": "2026-10-28T05:00:00.000Z",
      "updatedAt": "2026-10-28T05:00:00.000Z"
    }
  }
}
```

### Purpose of Manifest Fields:
- **Normalized POSIX Paths**: All paths in `paths` and keys in `files` are stored as normalized forward-slash POSIX relative paths, ensuring cross-platform portability between Windows, macOS, and Linux.
- **SHA-256 Hashes**: Every file's content is hashed at installation time. When running `update` or `uninstall`, Vibe Kit recalculates the disk file hash. If the disk hash differs from the manifest, Vibe Kit knows the user has customized the file!

---

## Intelligent 3-Way Update Mechanics

Unlike naive installers that overwrite files blindly, `vibe-kit update` performs a three-way comparison between:
1. **The current toolkit source** (what the new version provides).
2. **The file on disk** (the current state in your workspace).
3. **The recorded manifest** (what was installed previously).

```
         ┌───────────────────┐
         │ Toolkit Source    │
         └─────────┬─────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐ ┌──────────────────┐
│ Recorded Manifest│ │ File on Disk     │
└──────────────────┘ └──────────────────┘
```

### Operation Matrix:
- **`UNCHANGED`**: Disk hash matches current source hash. No write needed.
- **`UPDATE`**: File on disk matches recorded manifest hash (untouched by user), but toolkit source has a newer version. Safely overwritten.
- **`USER_MODIFIED_CONFLICT`**: File on disk differs from recorded manifest hash. Vibe Kit protects user work. By default (`keep`), it is preserved. If `--conflict replace` is chosen, a safe backup is created first.
- **`SKIP_DELETED`**: File was deleted by the user. Vibe Kit respects user intent and will not resurrect the file unless `--force` is passed.
- **`ADD`**: A new asset provided by the profile is safely added.
- **`RETAIN`**: File was installed previously but is no longer part of the toolkit. Preserved in the workspace and kept in the manifest.

---

## Transactional Rollback & Conflict Backups

Filesystem operations in Vibe Kit are treated as **atomic transactions**:

### 1. Collision-Safe Backups
When `--conflict replace` is chosen, the existing file is saved using a timestamped collision-safe pattern:
```
docs/ai-workflow/PROJECT_CONTEXT.md.backup-2026-10-28T05-30-00-123Z
```
If a file with that name already exists, a numerical suffix is appended (`-1`, `-2`, etc.) using exclusive copy flags (`COPYFILE_EXCL`), ensuring user backups are never overwritten.

### 2. Atomic Rollback Journal
During `init` and `update`, before any existing file is modified, a temporary rollback snapshot is created:
```
<file>.vibe-rollback-<timestamp>-<randomId>
```
If an I/O error, permission failure, or disk error occurs at **any** point (including while writing the manifest):
1. Overwritten files are restored from their `.vibe-rollback-*` snapshots.
2. Newly created files are unlinked.
3. The manifest is restored to its exact initial state.
4. User backups (`.backup-*`) are **preserved** (never deleted).
5. All temporary rollback snapshots are cleaned up.

---

## Path Traversal & Symbolic-Link Security

Vibe Kit implements a defense-in-depth security model to prevent directory traversal and symlink escape attacks:

### Textual Containment Checks
Paths are validated to reject absolute paths, directory traversal sequences (`..`), and invalid characters before any disk operation.

### Deep Ancestor Realpath Resolution
Textual path checks alone are insufficient if a parent folder (e.g., `.agents/` or `.agents/skills/`) is a symbolic link or junction pointing to an external directory (e.g., `C:\SensitiveData` or `/etc/`).

Vibe Kit's `resolveRealPath` traverses the path hierarchy upwards:
1. It resolves existing directories and symlinks recursively.
2. If intermediate folders do not yet exist, it resolves the deepest existing ancestor directory.
3. It reconstructs the real physical path and asserts that the real path remains strictly inside the real target directory via `isStrictlyInside`.
4. If any link points outside the target workspace, the operation is **aborted immediately** before any file is created or written.

### Windows Extended-Length Path Support
On Windows, NT namespace prefixes (`\\?\` and `\\?\UNC\`) and drive letter case variations are stripped and normalized via `stripExtendedPrefix` and `normalizeForCompare`, ensuring robust containment checks regardless of OS idiosyncrasies.
