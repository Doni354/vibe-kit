# Vibe Kit

**Vibe Kit** (`@doni354/vibe-kit`, CLI `vibe-kit`) is an end-to-end AI-assisted software development toolkit tailored for Google Antigravity. It equips coding agents with structured discovery, requirements formulation, system architecture, backend/frontend engineering standards, risk-based verification, and documentation templates.

---

## Requirements

- **Node.js**: v18.0.0 or newer
- **Environment**: Windows, macOS, or Linux
- **Target Coding Agent**: Google Antigravity (uses `.agents/skills/` and `.agents/rules/` workspace customization roots)

---

## Installation & Quick Start

### Global Installation (via npm)

Once published or linked locally:

```powershell
npm install -g @doni354/vibe-kit
```

### Running in a Target Workspace

Navigate to your target project directory and initialize the workflow:

```powershell
cd D:\Project\MyApp
vibe-kit init
```

The interactive wizard will guide you to select an installation scope and profile.

### Running from Source / Repository

```powershell
git clone https://github.com/doni354/vibe-kit.git
cd vibe-kit
npm install
npm test

# Run CLI directly
node bin/vibe-kit.js --help
node bin/vibe-kit.js init --target "D:\Project\MyApp" --profile fullstack --dry-run
```

---

## Workflows & Usage Scenarios

### Scenario A: New / Greenfield Project (No Existing Code)
1. Initialize the toolkit:
   ```powershell
   cd D:\Project\NewApp
   vibe-kit init --profile fullstack --yes
   ```
2. The agent reads `skills/project-onboarding/SKILL.md` to classify the project as greenfield.
3. The agent clarifies requirements, scope, target users, and acceptance criteria in `docs/ai-workflow/PROJECT_CONTEXT.md` and `docs/ai-workflow/plan.md`.
4. The agent scaffolds minimal project structure, implements components incrementally, and runs verification checks.

### Scenario B: Ongoing / Existing Codebase
1. Initialize the toolkit in your existing project:
   ```powershell
   cd D:\Project\ExistingApp
   vibe-kit init --profile fullstack --conflict keep --yes
   ```
2. The agent executes an **audit-only read pass** inspecting dependencies, existing conventions, routes, and tests.
3. The agent preserves existing architecture and never forces unnecessary directory scaffolds or unwanted refactors.
4. For each feature or fix, the agent follows `plan.md`, implements surgical changes, and runs targeted tests.

---

## CLI Commands & Options

```text
vibe-kit <command> [options]
```

### Commands

| Command | Description |
|---|---|
| `vibe-kit init` | Installs workflow skills, engineering rules, and documentation templates into the project. |
| `vibe-kit update` | Synchronizes and updates project workflow assets with the currently installed toolkit version. |
| `vibe-kit uninstall` | Safely removes tracked toolkit assets using the generated manifest. |
| `vibe-kit doctor` | Performs diagnostic health checks on Node runtime, manifest validity, and file integrity. |

### Command Options

| Option | Values | Default | Description |
|---|---|---|---|
| `--target PATH` | File path | `.` (cwd) | Target project workspace directory. |
| `--scope SCOPE` | `workspace` \| `global` | `workspace` | Target scope: project-local (`.agents/`) or user global (`~/.gemini/config`). |
| `--profile PROFILE` | `base` \| `frontend` \| `backend` \| `fullstack` | `fullstack` | Workflow profile to install. |
| `--conflict POLICY` | `keep` \| `replace` \| `skip` | `keep` | Policy when encountering existing files. |
| `--dry-run` | Flag | `false` | Preview all actions without writing or deleting any files. |
| `--yes` | Flag | `false` | Non-interactive mode (safe defaults; protects user-modified files). |
| `--force` | Flag | `false` | Force recreation of deleted files during update, or deletion of modified files during uninstall. |
| `--version, -v` | Flag | N/A | Display installed package version. |
| `--help, -h` | Flag | N/A | Display help menu. |

---

## Package Updates vs Project Asset Updates

It is important to distinguish updating the CLI package from updating workflow assets in a project:

1. **Updating the CLI Package**:
   To update the global npm package to a newer version:
   ```powershell
   npm update -g @doni354/vibe-kit
   ```
2. **Updating Project Assets**:
   To synchronize your project's `.agents/` and `docs/ai-workflow/` files with the newly installed CLI package:
   ```powershell
   cd D:\Project\MyApp
   vibe-kit update
   ```
   - Automatically detects previously installed scope and profile from `.vibe-kit-manifest.json`.
   - Safely updates unmodified toolkit files.
   - **Protects user modifications**: Files edited by the user are never overwritten silently.
   - **Respects intentional deletions**: Files deleted by the user are not recreated unless `--force` is provided.
   - Retains legacy files no longer supplied by newer toolkit versions.

---

## Profiles Overview

| Profile | Included Skills & Guidelines |
|---|---|
| `base` | `project-onboarding`, `documentation`, `verification`, engineering rules, and documentation templates. |
| `frontend` | `base` + `ui-implementation` (design tokens, component states, accessibility, responsive design). |
| `backend` | `base` + `backend-feature` (validation, authorization, API contracts, migrations, secure logging). |
| `fullstack` | Complete suite: `base` + `frontend` + `backend`. |

---

## Uninstall & Conflict Safety Model

- **SHA-256 Checksum Verification**: Every installed file is fingerprinted in `.vibe-kit-manifest.json`.
- **Path Traversal Protection**: Manifes path handling strictly prevents directory traversal (`..`) or deleting files outside the project target.
- **Safe Uninstall**:
  ```powershell
  vibe-kit uninstall
  ```
  - Files matching original hashes are unlinked cleanly.
  - Files modified by the user are flagged (`[KEPT - USER MODIFIED]`) and preserved, requiring explicit interactive confirmation or `--force` to delete.
  - Empty directories created by Vibe Kit are pruned, while directories containing user files are left intact.
- **Collision-Safe Backups**: When `--conflict replace` is used, existing files are backed up with unique collision-free timestamps (`.backup-<timestamp>-<counter>`).

---

## Antigravity Compatibility

Vibe Kit adheres strictly to Google Antigravity customization specifications:
- **Workspace Customization Root**: `.agents/`
  - Skills: `.agents/skills/<skill-name>/SKILL.md` (with valid YAML frontmatter `name` and `description`).
  - Rules: `.agents/rules/*.md` (with `trigger: always_on` for unconditional adherence).
- **Global Customization Root**: `~/.gemini/config/` (on Windows: `%USERPROFILE%\.gemini\config`).

---

## License

MIT © Doni
