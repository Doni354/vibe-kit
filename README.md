# Vibe Kit

[![npm version](https://img.shields.io/npm/v/@doni354/vibe-kit.svg?color=6366f1)](https://www.npmjs.com/package/@doni354/vibe-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Docs](https://img.shields.io/badge/docs-GitHub_Pages-6366f1.svg)](https://doni354.github.io/vibe-kit/)

**Vibe Kit** (`@doni354/vibe-kit`, CLI `vibe-kit`) is an end-to-end AI-assisted coding workflow toolkit tailored for Google Antigravity and autonomous coding agents. It equips projects with structured onboarding, system architecture, defensive backend/frontend engineering rules, multi-layer verification gates, and living documentation templates.

📖 **Official Documentation**: [https://doni354.github.io/vibe-kit/](https://doni354.github.io/vibe-kit/)

---

## Why Vibe Kit?

Autonomous AI coding agents frequently struggle with context fragmentation, hallucinations, missing architecture artifacts, and unconstrained code generation. 

Vibe Kit provides a structured, safety-first framework:
- **7 Antigravity Skills**: Specialized instructions for onboarding, documentation, defensive backend APIs, accessible UI design, cross-layer fullstack integration, engine-independent video/motion, and 5-layer verification gates.
- **Unconditional Engineering Rules**: Workspace rules with `trigger: always_on` to enforce modularity, testing, security, and agent conduct.
- **9 Living Architecture Templates**: Structured documents in `docs/ai-workflow/` for project context, API contracts, data models, design systems, architecture, implementation plans, storyboards, and video QC checklists.
- **Deterministic Pack Architecture**: Modular packs (`core`, `role:frontend`, `role:backend`, `role:fullstack`, `role:video-motion`) resolved deterministically with topological ordering and deduplication.
- **Safety-First CLI**: Built-in path traversal guards, ancestor symlink escape prevention, SHA-256 manifest tracking, collision-free backups, and atomic transactional rollback.

---

## Installation & Quick Start

### Global Installation (Recommended)

```bash
npm install -g @doni354/vibe-kit
```

Verify your installation:
```bash
vibe-kit --version
vibe-kit doctor
```

### Run Instantly via `npx`

```bash
npx @doni354/vibe-kit init
```

---

## Initializing a Workspace

Navigate to your project root and run:

```bash
vibe-kit init
```

The interactive prompt helps you select your target scope and profile:

```bash
# Non-interactive initialization for fullstack projects
vibe-kit init --scope workspace --profile fullstack --yes

# Preview changes without modifying disk
vibe-kit init --profile fullstack --dry-run
```

::: tip Non-Destructive
Vibe Kit only installs workflow assets and living documentation templates. It **never** alters or overwrites your application source code.
:::

---

## Workflow Scenarios

### Scenario A: New / Greenfield Project
1. Initialize the toolkit:
   ```bash
   vibe-kit init --profile fullstack --yes
   ```
2. Your AI agent reads `.agents/skills/project-onboarding/SKILL.md` to classify the project as greenfield.
3. The agent interviews you for business objectives, user roles, and constraints, populating `docs/ai-workflow/PROJECT_CONTEXT.md` and `docs/ai-workflow/plan.md`.
4. The agent scaffolds minimal project structure, implements components incrementally, and executes automated verification gates.

### Scenario B: Ongoing / Existing Codebase
1. Initialize the toolkit in your existing repository:
   ```bash
   vibe-kit init --profile fullstack --conflict keep --yes
   ```
2. The agent executes an **audit-only read pass** inspecting dependencies, framework conventions, routes, and tests.
3. The agent preserves existing architecture and never forces unwanted refactors.
4. For each feature or bugfix, the agent follows `plan.md`, implements surgical changes, and updates living documentation in `docs/ai-workflow/`.

---

## Profiles & Modular Role Packs

Vibe Kit supports both legacy profiles and explicit modular packs (`--pack`):

### Profiles (Legacy Compatibility)

| Profile | Mapped Pack(s) | Included Skills & Workflow Assets |
| :--- | :--- | :--- |
| `base` | `core` | Foundational workflow: `project-onboarding`, `documentation`, `verification`, engineering rules, and core templates (`PROJECT_CONTEXT.md`, `README.md`, `plan.md`). |
| `frontend` | `core` + `role:frontend` | Base workflow + `ui-implementation` (design tokens, lifecycle states, WCAG a11y, responsive layouts) + `design-system.md`. |
| `backend` | `core` + `role:backend` | Base workflow + `backend-feature` (validation, authorization, API contracts, safe migrations) + `api-contracts.md`, `data-model.md`. |
| `fullstack` | `core` + `role:frontend` + `role:backend` + `role:fullstack` | Complete cross-layer suite: all frontend/backend assets + `fullstack-integration` (contract-first API sync, boundary state, E2E) + `architecture.md`. |

> **Legacy Profile Note**: In v0.1.0, `--profile base` copied all 7 documentation templates. In modular packs (v0.2.0+), `--profile base` maps to `core`, installing only foundational templates to keep minimal projects lean. Existing v0.1.0 installations retain all their templates during `vibe-kit update` via non-destructive update semantics.

### Built-in Modular Packs (`--pack`)

| Pack ID | Type | Description & Assets Contributed |
| :--- | :--- | :--- |
| `core` | `core` | Foundational skills (`project-onboarding`, `documentation`, `verification`), engineering rules, and base planning templates. |
| `role:frontend` | `role` | UI engineering workflow (`ui-implementation` skill + `design-system.md` template). Requires `core`. |
| `role:backend` | `role` | Server engineering workflow (`backend-feature` skill + `api-contracts.md`, `data-model.md` templates). Requires `core`. |
| `role:fullstack` | `role` | Cross-layer coordination workflow (`fullstack-integration` skill + `architecture.md` template). Requires `core`, `role:frontend`, `role:backend`. |
| `role:video-motion` | `role` | Engine-independent video workflow (`video-motion` skill + `storyboard.md`, `video-qc-checklist.md` templates). Requires `core`. |

---

## CLI Commands & Options

```text
vibe-kit <command> [options]
```

### Commands

| Command | Description |
| :--- | :--- |
| `vibe-kit init` | Installs workflow skills, engineering rules, and documentation templates into the project. |
| `vibe-kit detect` | Inspects project repository to detect technologies and recommend relevant role packs without modifying files. |
| `vibe-kit config` | Inspects or modifies persistent project configuration (`.vibe-kit.json`) and user overrides. |
| `vibe-kit update` | Synchronizes and updates project workflow assets with the current toolkit version using a 3-way diff. |
| `vibe-kit uninstall` | Safely removes tracked toolkit assets using the generated manifest without deleting user-modified files. |
| `vibe-kit doctor` | Performs diagnostic health checks on Node runtime, toolkit assets, manifest health, and symlink containment. |

### Command Options

| Option | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `--target PATH` | File path | `.` (cwd) | Target project workspace directory. |
| `--scope SCOPE` | `workspace` \| `global` | `workspace` | Target scope: project-local (`.agents/`) or user global (`~/.gemini/config`). |
| `--profile PROFILE` | `base` \| `frontend` \| `backend` \| `fullstack` | `fullstack` | Legacy profile alias mapping to standard packs. |
| `--pack PACK(S)` | Comma-separated IDs | N/A | Explicitly select pack(s) to install (e.g. `role:video-motion` or `core,role:frontend`). |
| `--conflict POLICY` | `keep` \| `replace` \| `skip` | `keep` | Policy when encountering existing files. |
| `--dry-run` | Flag | `false` | Preview all actions without writing or deleting any files. |
| `--yes` | Flag | `false` | Non-interactive mode (safe defaults; protects user-modified files). |
| `--force` | Flag | `false` | Force recreation of deleted files during update, or deletion of modified files during uninstall. |
| `--enable TECH` | Tech ID | N/A | Override technology to enable in configuration (e.g. `tech:postgresql`). |
| `--disable TECH` | Tech ID | N/A | Override technology to disable in configuration. |
| `--reset` | Flag | `false` | Reset all configuration overrides back to automated detection defaults. |
| `--save` | Flag | `false` | Save detection results directly to `.vibe-kit.json`. |
| `--json` | Flag | `false` | Output command results in raw JSON format. |
| `--version, -v` | Flag | N/A | Display installed package version. |
| `--help, -h` | Flag | N/A | Display help menu. |

---

## Package Updates vs Project Asset Updates

It is important to distinguish updating the CLI package from updating workflow assets in a project:

1. **Updating the CLI Package**:
   ```bash
   npm update -g @doni354/vibe-kit
   ```
2. **Updating Project Workflow Assets**:
   ```bash
   vibe-kit update
   ```
   - Automatically detects previously installed profile from `.vibe-kit-manifest.json`.
   - Safely updates unmodified toolkit files.
   - **Protects user modifications**: Files customized by the user are never overwritten silently.
   - **Respects intentional deletions**: Files deleted by the user are not resurrected unless `--force` is specified.
   - Preserves user backups (`.backup-*`) and restores previous files if any update step fails via atomic journal rollback.

---

## Safety & Security Architecture

- **SHA-256 Checksum Verification**: Every installed file is fingerprinted in `.vibe-kit-manifest.json`.
- **Path Traversal & Symlink Escape Prevention**: Evaluates both textual paths and physical realpaths across ancestor directories to prevent symlinks from escaping the target workspace.
- **Safe Uninstall**: User-modified files are flagged (`[KEPT - USER MODIFIED]`) and preserved unless `--force` is supplied. Empty parent directories are pruned without touching user files.
- **Collision-Safe Backups**: When `--conflict replace` is used, existing files are archived with unique timestamps (`.backup-<timestamp>-<counter>`).
- **Atomic Rollback Snapshots**: Any error mid-operation automatically restores all overwritten files from `.vibe-rollback-*` snapshots.

---

## Google Antigravity Compatibility

Vibe Kit adheres strictly to Google Antigravity customization specifications:
- **Workspace Customization Root**: `.agents/`
  - Skills: `.agents/skills/<skill-name>/SKILL.md` (with valid YAML frontmatter `name` and `description`).
  - Rules: `.agents/rules/*.md` (with `trigger: always_on` for unconditional enforcement).
- **Global Customization Root**: `~/.gemini/config/` (on Windows: `%USERPROFILE%\.gemini\config`).

---

## Documentation & Community

- **Documentation**: [https://doni354.github.io/vibe-kit/](https://doni354.github.io/vibe-kit/)
- **GitHub Repository**: [https://github.com/doni354/vibe-kit](https://github.com/doni354/vibe-kit)
- **Issues & Discussions**: [https://github.com/doni354/vibe-kit/issues](https://github.com/doni354/vibe-kit/issues)
- **npm Registry**: [https://www.npmjs.com/package/@doni354/vibe-kit](https://www.npmjs.com/package/@doni354/vibe-kit)

---

## License

Vibe Kit is open-source software licensed under the [MIT License](./LICENSE).

Copyright (c) 2026 doni354
