# Installation & Quick Start

Get your workspace ready for autonomous AI coding agents in under two minutes with Vibe Kit.

---

## System Requirements

Before installing Vibe Kit, ensure your development environment satisfies the runtime requirements:

| Component | Minimum Required | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `20.x` or `22.x` (LTS) | Required by `package.json` engines |
| **npm** | `>= 9.0.0` | Latest | Bundled with modern Node.js releases |
| **Operating System**| Any | Linux, macOS, or Windows | Fully tested across POSIX and Windows |
| **Antigravity IDE / Agent** | Optional | Recommended | Compatible with Google Antigravity & AI tools |

To verify your Node.js version, run:

```bash
node --version
# Expected: v18.0.0 or higher
```

---

## Installation Methods

### Option 1: Global npm Installation (Recommended)

Installing globally makes the `vibe-kit` command permanently available across all your terminal sessions:

```bash
npm install -g @doni354/vibe-kit
```

Verify that the CLI is accessible:

```bash
vibe-kit --version
# Output: @doni354/vibe-kit v0.1.0

vibe-kit --help
```

### Option 2: Run Directly via `npx` (No Global Install)

If you prefer not to install global packages, execute any command directly using `npx`:

```bash
npx @doni354/vibe-kit init
npx @doni354/vibe-kit doctor
```

---

## Initializing a Workspace

Navigate to the root folder of your project and run:

```bash
cd /path/to/your-project
vibe-kit init
```

### Interactive Mode

In an interactive terminal (TTY), `vibe-kit init` guides you through three quick prompts:

1. **Installation Scope**:
   - `Workspace ini saja (direkomendasikan)`: Places skills in `.agents/skills`, rules in `.agents/rules`, and templates in `docs/ai-workflow/`.
   - `Global untuk user ini`: Places skills in `~/.gemini/config/skills` and global standards in `~/.gemini/config/rules/`.
2. **Profile Selection**:
   - `Base`: Onboarding, living documentation, and verification gates.
   - `Frontend`: Base + UI design system and visual verification.
   - `Backend`: Base + defensive backend feature engineering.
   - `Fullstack`: Complete suite of all 5 skills and 7 templates.
3. **Confirmation**:
   - Displays summary of target, scope, and profile before writing any files.

### Automated / Non-Interactive Mode

For CI/CD scripts, automated environments, or quick scaffolding, pass explicit command-line flags with `--yes`:

```bash
# Initialize a fullstack workspace non-interactively
vibe-kit init --scope workspace --profile fullstack --yes

# Initialize a frontend-only workspace
vibe-kit init --profile frontend --yes

# Preview changes without modifying disk
vibe-kit init --profile fullstack --dry-run
```

::: tip Non-Destructive Guarantee
`vibe-kit init` only installs workflow assets and documentation templates. It **never** alters, rewrites, or deletes your application source code (`src/`, `lib/`, `tests/`, etc.).
:::

---

## Realistic Scenarios

### Scenario A: Greenfield Project (Brand New App)

When starting a project from scratch, Vibe Kit establishes the architecture baseline before any code is generated:

```bash
mkdir my-new-saas
cd my-new-saas
git init
npm init -y

# Initialize Vibe Kit
vibe-kit init --profile fullstack --yes
```

**Next Steps with your AI Agent:**
1. Open your project in Google Antigravity or your AI editor.
2. Ask the agent: *"Read `.agents/skills/project-onboarding/SKILL.md` and initialize our `docs/ai-workflow/PROJECT_CONTEXT.md` based on our new product requirements."*
3. The agent will read the structured template, interview you for business objectives and constraints, and generate complete architecture documents in `docs/ai-workflow/`.

---

### Scenario B: Existing Codebase (Legacy or Ongoing App)

When introducing AI coding agents into an established codebase, Vibe Kit ensures the agent does not make blind assumptions:

```bash
cd existing-repo

# Run a dry-run to preview what will be added
vibe-kit init --profile fullstack --dry-run

# Apply the workflow
vibe-kit init --profile fullstack --yes
```

**Next Steps with your AI Agent:**
1. Direct the agent to execute the existing codebase onboarding flow:
   *"Follow `.agents/skills/project-onboarding/SKILL.md` to inspect our existing codebase, discover our framework conventions, and document our data models in `docs/ai-workflow/data-model.md`."*
2. The agent inspects existing models, migrations, and routes, and synchronizes the living documentation without hallucinating missing dependencies.

---

## Reviewing Created Files

After running `vibe-kit init`, review the generated structure:

### 1. `.agents/` (Antigravity Customizations)
- **`.agents/skills/*/SKILL.md`**: Specialized skill definitions formatted with YAML frontmatter (`name` and `description`). Agents load these on-demand when performing onboarding, backend tasks, UI design, or testing.
- **`.agents/rules/engineering-standards.md`**: Core engineering directives tagged with `trigger: always_on` for strict adherence to code modularity, deterministic testing, and safety constraints.

### 2. `docs/ai-workflow/` (Living Documentation)
- **`PROJECT_CONTEXT.md`**: Mission, user personas, business rules, and constraints.
- **`architecture.md`**: System boundaries, component topology, and Mermaid diagrams.
- **`api-contracts.md`**: REST/GraphQL specifications, request/response schemas, error formats.
- **`data-model.md`**: Entity-relationship definitions, migration policies, indexing strategy.
- **`design-system.md`**: Design tokens, component states, and accessibility contracts.
- **`plan.md`**: Phased milestones, acceptance criteria, and rollback triggers.
- **`README.md`**: Index and usage guide for the living documentation workflow.

### 3. `.vibe-kit-manifest.json` (Cryptographic Manifest)
Contains SHA-256 hashes of every installed asset, the toolkit version, and the active profile. This allows Vibe Kit to detect user modifications during subsequent `update` and `uninstall` commands.

---

## Verifying Workspace Health

To confirm that your workspace is correctly configured and all files are intact, run the diagnostic command:

```bash
vibe-kit doctor
```

If everything is in order, `doctor` outputs a clean bill of health:

```text
vibe-kit doctor — diagnostic report
-----------------------------------
CLI Version:       v0.1.0
Node.js:           v20.18.0 (Platform: linux)
Target workspace:  /home/developer/my-project

Pemeriksaan Diagnostik:
  [PASS] Versi Node.js (v20.18.0) memenuhi syarat engine >=18
  [PASS] Struktur dan file asset sumber toolkit lengkap
  [PASS] Direktori target memiliki izin baca dan tulis

Status Manifes:
Manifest status:   Ditemukan (.vibe-kit-manifest.json)
  [PASS] Format manifes valid (v0.1.0, profile: fullstack)
  [PASS] Seluruh 11 path dalam manifes aman dan berada di dalam target
  [PASS] Semua file terpasang (11 file) utuh dan sesuai hash manifes

Antigravity Integrasi:
  [PASS] Workspace agents direktori (.agents) valid dan berada di dalam target
  [PASS] Workspace skills direktori (.agents/skills) valid
  [PASS] Workspace rules direktori (.agents/rules) valid

Ringkasan: 8 PASS, 0 WARN, 0 FAIL
Status Diagnostik: PASS (Semua komponen dalam kondisi prima)
```
