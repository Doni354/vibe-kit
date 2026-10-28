---
layout: home

hero:
  name: "Vibe Kit"
  text: "AI Coding Workflow Toolkit"
  tagline: "End-to-end framework for autonomous AI coding agents: reusable rules, specialized skills, living architecture templates, and a safety-focused CLI."
  image:
    src: /logo.svg
    alt: Vibe Kit Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: CLI Reference
      link: /reference/cli
    - theme: alt
      text: View on GitHub
      link: https://github.com/doni354/vibe-kit

features:
  - icon: 🎯
    title: Purpose-Built for Google Antigravity
    details: Seamlessly installs skills to .agents/skills/ and rules with trigger always_on to .agents/rules/, fully aligned with official Antigravity customization standards.
  - icon: 🛡️
    title: Security & Containment Engine
    details: Deep path traversal prevention, ancestor symlink escape rejection, SHA-256 manifest tracking, and atomic rollback snapshots protect your workspace.
  - icon: 🔄
    title: Intelligent 3-Way Update
    details: Differentiates untouched files, upstream updates, and user modifications. Safely creates collision-free backups before touching user edits.
  - icon: 📐
    title: 7 Living Architecture Templates
    details: Standardized documents in docs/ai-workflow/ for project context, API contracts, data models, architecture diagrams, and testing plans.
  - icon: ⚡
    title: Tailored Profiles
    details: Choose between base, frontend, backend, or fullstack profiles to install exactly what your project needs without clutter.
  - icon: 🩺
    title: Comprehensive Doctor Diagnostics
    details: Built-in health checks verify Node.js runtime, toolkit asset integrity, workspace permissions, manifest health, and symlink containment.
---

<div class="custom-badge-container" style="text-align: center; margin-top: 2rem;">
  <span class="custom-badge">⚡ Published on npm as <code>@doni354/vibe-kit</code> • Node.js >= 18</span>
</div>

## Quick Installation

Install globally via npm or run directly with `npx`:

```bash
# Global installation (recommended for repeated use)
npm install -g @doni354/vibe-kit

# Initialize your project interactively
vibe-kit init

# Or run instantly without installation
npx @doni354/vibe-kit init
```

---

## The Problem Vibe Kit Solves

Autonomous AI coding agents (such as Google Antigravity, Claude Code, and Gemini agents) are remarkably capable at writing code, but they frequently encounter systemic friction when operating in complex software projects:

1. **Context Amnesia & Guesswork**: Without structured living documentation, agents spend excess tokens rediscovering architecture, making contradictory assumptions, and generating inconsistent database schemas or UI patterns.
2. **Generic, Unenforced Standards**: Generic prompts lack domain-specific constraints. Agents often bypass automated tests, omit input validation, introduce accessibility violations, or break design tokens.
3. **Destructive Tooling Setup**: Traditional boilerplates overwrite customized files blindly or lack uninstall mechanisms, leaving orphan files and security hazards.

**Vibe Kit solves this with a two-part system:**
- **Standardized Agent Customizations**: Reusable skills, unconditional rules (`trigger: always_on`), and living templates that guide agents through systematic onboarding, defensive backend design, accessible UI construction, and multi-layer verification.
- **Safety-First CLI (`vibe-kit`)**: A resilient installer with path traversal guards, symbolic-link containment verification, atomic transactional rollback, user-modification detection, and diagnostics.

---

## Workflow at a Glance

When you run `vibe-kit init` in your project, Vibe Kit configures a clean, non-intrusive environment for AI agents:

```
your-project/
├── .agents/
│   ├── skills/                       # Antigravity Skills (frontmatter + instructions)
│   │   ├── project-onboarding/SKILL.md
│   │   ├── documentation/SKILL.md
│   │   ├── verification/SKILL.md
│   │   ├── backend-feature/SKILL.md  # (backend & fullstack profiles)
│   │   └── ui-implementation/SKILL.md# (frontend & fullstack profiles)
│   └── rules/
│       └── engineering-standards.md  # Workspace rules (always_on)
├── docs/
│   └── ai-workflow/                  # Living Documentation Templates
│       ├── PROJECT_CONTEXT.md
│       ├── README.md
│       ├── architecture.md
│       ├── api-contracts.md
│       ├── data-model.md
│       ├── design-system.md
│       └── plan.md
└── .vibe-kit-manifest.json           # Cryptographic SHA-256 install manifest
```

---

## Core Capabilities Grounded in the Codebase

| Capability | Implementation Detail |
| :--- | :--- |
| **Antigravity Customization** | Skills feature valid YAML frontmatter (`name`, `description`) and comprehensive workflow steps; rules feature `trigger: always_on` for strict execution compliance. |
| **Profile Modularity** | Select between `base`, `frontend`, `backend`, and `fullstack`. Re-running with a broader profile automatically merges new assets into the existing manifest. |
| **Safety & Containment** | Functions `isStrictlyInside` and `fromPosixRelative` inspect both textual and real filesystem paths, traversing ancestor chains to block directory symlink escapes. |
| **Collision-Safe Backups** | If `--conflict replace` is specified, existing modified files are archived as `.backup-<timestamp>-<counter>` before writing. |
| **Atomic Rollback** | In `init` and `update`, writes and manifest modifications occur inside a transactional journal. If an operation fails, all modified files are restored from `.vibe-rollback-*` snapshots. |
| **Workspace & Global Scopes** | Supports project-level installation (`workspace` in `.agents/`) and user-level installation (`global` in `~/.gemini/config/`). |

---

## Ready to Elevate Your AI Coding Workflow?

Explore the guides to set up Vibe Kit in minutes:

- [🚀 Installation & Quick Start Guide](/guide/getting-started)
- [📋 CLI Command & Options Reference](/reference/cli)
- [📦 Profiles & Asset Inventory](/guide/profiles)
- [🛡️ Workflow & Safety Architecture](/guide/workflow-architecture)
