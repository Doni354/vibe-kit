# CLI Reference

Complete reference for the `vibe-kit` command-line interface.

---

## Command Syntax

```bash
vibe-kit <command> [options]
```

Or with `npx`:

```bash
npx @doni354/vibe-kit <command> [options]
```

### Argument Syntax

Vibe Kit uses a custom argument parser implemented in `lib/cli.js`:
- Both `--option value` and `--option=value` syntaxes are supported.
- Short aliases are supported where applicable (e.g., `-v` for `--version`, `-h` for `--help`).
- Unknown flags are rejected with an explicit error to prevent accidental misconfigurations.

---

## Commands

### `init`

Initializes workflow skills, rules, and living documentation templates in the target directory.

```bash
vibe-kit init [--target PATH] [--scope workspace|global] [--profile base|frontend|backend|fullstack] [--pack PACK] [--conflict keep|replace|skip] [--dry-run] [--yes]
```

**Behavior & Guarantees:**
- **Pre-flight Safety Check**: Verifies that every source file exists and every destination path is strictly contained within the target directory before writing or creating any directories.
- **Toolkit Protection**: Rejects initializing directly inside the Vibe Kit toolkit repository itself or its parent directories.
- **Manifest Merging**: If an existing manifest is present (for example, upgrading from `base` to `fullstack`, or adding `role:video-motion`), new files are added while preserving records of previously installed files.
- **Atomic Journal Rollback**: Tracks file creations and overwrites. If any file fails to write or if manifest generation fails, all modified files are restored from temporary `.vibe-rollback-*` snapshots, created files are unlinked, and the initial manifest is restored.

---

### `detect`

Inspects the project repository to detect technologies and recommend role packs without modifying any files.

```bash
vibe-kit detect [--target PATH] [--save] [--dry-run] [--json]
```

**Options:**
- `--save`: Persists detected technologies and recommendations to `.vibe-kit.json`.
- `--json`: Outputs raw JSON analysis for programmatic inspection.

---

### `config`

Inspects or modifies persistent project configuration (`.vibe-kit.json`) and user overrides.

```bash
vibe-kit config [--target PATH] [--show] [--enable TECH] [--disable TECH] [--pack PACK] [--reset] [--dry-run] [--json]
```

**Options:**
- `--enable TECH`: Manually enables a specific technology override (e.g. `tech:postgresql`).
- `--disable TECH`: Manually disables an automated technology detection.
- `--pack PACK`: Overrides persistent role packs to install.
- `--reset`: Clears all user overrides, restoring pure automated detection defaults.

---

### `update`

Updates previously installed workflow assets to the current toolkit version using an intelligent three-way comparison.

```bash
vibe-kit update [--target PATH] [--scope workspace|global] [--profile base|frontend|backend|fullstack] [--pack PACK] [--conflict keep|replace|skip] [--dry-run] [--yes] [--force]
```

**Requirements:**
- A valid manifest (`.vibe-kit-manifest.json` for workspace, `vibe-kit-global-manifest.json` for global) must exist in the target. If the manifest is missing or corrupt, `update` halts immediately to prevent data loss.

**Three-Way Comparison Semantics:**

| Operation State | Condition | Default Behavior |
| :--- | :--- | :--- |
| `UNCHANGED` | Disk hash matches source hash. | File is preserved; manifest timestamp is updated. |
| `UPDATE` | Disk matches recorded manifest hash, but toolkit source has a newer version. | Safely updated with new toolkit version. |
| `ADD` | File is provided by current profile but was not in previous manifest. | Created in target workspace. |
| `USER_MODIFIED_CONFLICT` | Disk hash differs from recorded manifest hash and toolkit has changed. | Preserved by default (`keep`). If `--conflict replace` is passed, creates `.backup-<timestamp>-<counter>` before updating. |
| `SKIP_DELETED` | File was deleted by user on disk. | Respected and omitted by default. Re-created only if `--force` is passed. |
| `RETAIN` | File is tracked in manifest but no longer provided by toolkit. | Preserved in workspace and kept in manifest. |

**Important Distinction:**
`vibe-kit update` updates the **workflow assets** installed in your workspace. To update the CLI package itself, run:
```bash
npm update -g @doni354/vibe-kit
```

---

### `uninstall`

Safely removes installed workflow assets from the target workspace or global directory.

```bash
vibe-kit uninstall [--target PATH] [--scope workspace|global] [--dry-run] [--yes] [--force]
```

**Safety Protections:**
- **User Modification Protection**: Every tracked file is hashed with SHA-256 and compared against the recorded manifest hash. If a file has been modified by the user:
  - In non-interactive mode (`--yes`): The file is **kept** unless `--force` is specified.
  - In interactive mode: Prompts for confirmation with `[y/N]` (defaults to No).
  - With `--force`: Unconditionally deletes the modified file.
- **Path Traversal & Symlink Safety**: Rejects any path in the manifest that resolves outside the target directory. External files are never touched.
- **Clean Parent Cleanup**: Removes empty parent directories (such as `.agents/skills/<skill-name>`) recursively without deleting non-empty directories or traversing external symlinks.
- **Manifest Removal**: Prompts or removes the `.vibe-kit-manifest.json` upon completion.

---

### `doctor`

Runs a diagnostic health check across the Node.js runtime, toolkit assets, target workspace, manifest integrity, and Antigravity directory structures.

```bash
vibe-kit doctor [--target PATH]
```

**Diagnostics Performed:**
1. **Node.js Engine Check**: Validates `process.version >= 18.0.0`.
2. **Toolkit Assets Integrity**: Confirms that all skills in `skills/` and rules in `rules/` are physically present.
3. **Workspace Permissions**: Confirms read (`R_OK`) and write (`W_OK`) permissions on the target directory.
4. **Manifest Health & Path Security**:
   - Validates JSON structure and `paths` array.
   - Evaluates every tracked path for path traversal or symlink escapes.
   - Audits file status: reports counts of intact files, missing files (`WARN`), and user-modified files (`WARN`).
5. **Antigravity Customization Containment**:
   - Inspects `.agents`, `.agents/skills`, and `.agents/rules`.
   - Confirms that neither `.agents` nor its subdirectories are symbolic links escaping to external directories.

**Exit Codes:**
- `0`: All diagnostic checks passed or only warnings reported.
- `1`: One or more critical checks failed (`FAIL`).

---

## Options & Flags

### `--target PATH`
- **Type**: String
- **Default**: Current working directory (`process.cwd()`) for workspace scope; `~/.gemini/config` for global scope.
- **Description**: Specifies the root directory where assets and manifest are located.
- **Syntax**: `--target /path/to/project` or `--target=/path/to/project`.

---

### `--scope workspace|global`
- **Type**: String (`workspace` or `global`)
- **Default**: `workspace`
- **Description**:
  - `workspace`: Places files in `.agents/skills`, `.agents/rules`, `docs/ai-workflow/`, and writes `.vibe-kit-manifest.json`.
  - `global`: Places files in `<globalTarget>/skills`, `<globalTarget>/rules/vibe-kit-engineering-standards.md`, and writes `vibe-kit-global-manifest.json`.

---

### `--profile base|frontend|backend|fullstack`
- **Type**: String
- **Default**: `fullstack`
- **Description**: Legacy profile alias mapping to modular packs:
  - `base`: Maps to `core` (`project-onboarding`, `documentation`, `verification`, engineering rules, and base planning templates).
  - `frontend`: Maps to `core` + `role:frontend` (+ `ui-implementation`, `design-system.md`).
  - `backend`: Maps to `core` + `role:backend` (+ `backend-feature`, `api-contracts.md`, `data-model.md`).
  - `fullstack`: Maps to `core` + `role:frontend` + `role:backend` + `role:fullstack` (+ `fullstack-integration`, `architecture.md`).

---

### `--pack PACK`
- **Type**: String (comma-separated pack IDs)
- **Description**: Explicitly selects modular packs to install, automatically resolving dependencies:
  - `core`: Foundational onboarding, documentation, verification, and planning templates.
  - `role:frontend`: UI engineering workflow and design system template.
  - `role:backend`: Server engineering workflow, API contracts, and data model templates.
  - `role:fullstack`: Cross-layer coordination workflow and system architecture template.
  - `role:video-motion`: Engine-independent video workflow, storyboard plan, and QC checklist.
  - `tech:firebase`: Firebase platform workflow, trust boundaries, Security Rules, Firestore, and emulator testing.
  - `tech:postgresql`: PostgreSQL engineering workflow, schema design, indexing, transactions, and safe migrations.
- **Example**:
  ```bash
  vibe-kit init --pack role:video-motion
  vibe-kit init --pack role:frontend,tech:firebase
  vibe-kit init --pack role:backend,tech:postgresql
  vibe-kit init --profile backend --pack tech:postgresql
  ```

---

### `--conflict keep|replace|skip`
- **Type**: String (`keep`, `replace`, `skip`)
- **Default**: `keep` (when non-interactive or confirmed)
- **Description**: Resolves conflicts when a destination file already exists or has been modified by the user:
  - `keep`: Keeps the existing file untouched and records its current hash.
  - `replace`: Creates a collision-safe backup (`<path>.backup-<timestamp>-<counter>`) and replaces the file with the toolkit version.
  - `skip`: Skips writing the file completely.

---

### `--dry-run`
- **Type**: Boolean flag
- **Description**: Previews all actions (file creation, updates, skips, backups, deletions) in stdout without making any changes to disk.
- **Example**:
  ```bash
  vibe-kit update --dry-run
  vibe-kit uninstall --dry-run
  ```

---

### `--yes`
- **Type**: Boolean flag
- **Description**: Automatically accepts the initial confirmation prompt, allowing non-interactive execution. Safe defaults (`keep` for modified files) are preserved unless overridden by `--conflict` or `--force`.

---

### `--force`
- **Type**: Boolean flag
- **Description**: Bypasses protective guards for specific operations:
  - In `update`: Re-creates user-deleted files that are tracked in the manifest (`SKIP_DELETED` -> `RECREATE`).
  - In `uninstall`: Deletes user-modified files without asking for confirmation.

---

### `--version`, `-v`
- **Type**: Boolean flag
- **Description**: Prints the CLI package version and exits.
- **Example**:
  ```bash
  vibe-kit --version
  # @doni354/vibe-kit v0.1.0
  ```

---

### `--help`, `-h`
- **Type**: Boolean flag
- **Description**: Displays the CLI usage manual, available commands, options, and update notes.
