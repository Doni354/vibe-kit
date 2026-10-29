# Profiles & Workflow Assets

Vibe Kit provides a modular architecture allowing teams to install exactly the agent workflows and living documentation their projects require.

---

## Profile Matrix

The toolkit maps legacy profiles to modular packs (`lib/pack-resolver.js`):

| Profile | Mapped Pack(s) | Included Skills | Rules Installed | Templates Installed |
| :--- | :--- | :--- | :--- | :--- |
| **`base`** | `core` | `project-onboarding`<br>`documentation`<br>`verification` | Workspace rule | Core templates (`PROJECT_CONTEXT.md`, `README.md`, `plan.md`) |
| **`frontend`** | `core`<br>`role:frontend` | Base skills +<br>`ui-implementation` | Workspace rule | Core templates +<br>`design-system.md` |
| **`backend`** | `core`<br>`role:backend` | Base skills +<br>`backend-feature` | Workspace rule | Core templates +<br>`api-contracts.md`, `data-model.md` |
| **`fullstack`** | `core`<br>`role:frontend`<br>`role:backend`<br>`role:fullstack` | All 6 cross-layer skills incl.<br>`fullstack-integration` | Workspace rule | Core + frontend + backend +<br>`architecture.md` |

> **Note on `base` Profile Evolution**: In v0.1.0, `--profile base` copied all documentation templates. In the modular pack architecture (v0.2.0+), `--profile base` maps cleanly to `core`, installing only foundational planning templates to prevent unnecessary clutter in minimal projects. Existing v0.1.0 installations retain all their templates during updates.

---

## The 7 Antigravity Skills

Each skill is located in `.agents/skills/<skill-name>/SKILL.md` and contains valid YAML frontmatter (`name` and `description`) conforming to Google Antigravity standards.

### 1. `project-onboarding`
- **Frontmatter**: `name: project-onboarding`
- **Purpose**: Establishes a structured context baseline when an agent first interacts with a new or existing repository.
- **Workflow Highlights**:
  - **Step 1: Classification**: Differentiates between a *Greenfield* repository (needs initial scaffolding and requirements baseline) and an *Existing* repository (requires code archaeology, dependency inspection, and convention discovery).
  - **Step 2: Environment Verification**: Audits Node.js/package managers, environment variables (`.env.example`), and build tooling.
  - **Step 3: Document Archaeology**: Inspects existing architecture patterns, API routes, and schema structures.
  - **Step 4: Requirements Baseline**: Validates business goals, core user personas, and technical constraints before coding begins.
  - **Step 5: Living Document Generation**: Populates `docs/ai-workflow/PROJECT_CONTEXT.md` and initial plans.

### 2. `documentation`
- **Frontmatter**: `name: documentation`
- **Purpose**: Maintains living project documentation, architectural diagrams, decision records, and API contracts.
- **Workflow Highlights**:
  - **Architecture Diagrams**: Uses standardized Mermaid diagrams for sequence flows, component topologies, and data lifecycles.
  - **Architectural Decision Records (ADR)**: Structured format covering Context, Decision, Consequences, and Alternatives Considered.
  - **Synchronization Directives**: Instructs agents to update living documentation in `docs/ai-workflow/` whenever an API contract or schema changes during implementation.

### 3. `backend-feature`
- **Frontmatter**: `name: backend-feature`
- **Purpose**: Guides end-to-end backend engineering with strict emphasis on input validation, schema safety, error handling, and authorization.
- **Workflow Highlights**:
  - **Boundary Definition**: Verifies input types, query limits, authentication guards, and role-based authorization.
  - **Data Model & Migration Safety**: Enforces reversible migrations, index optimization, and transaction safety.
  - **Defensive Error Handling**: Replaces unhandled exceptions with structured error responses and sanitized log statements.
  - **Automated Backend Testing**: Requires automated unit and integration tests for every new route or mutation before completing the task.

### 4. `ui-implementation`
- **Frontmatter**: `name: ui-implementation`
- **Purpose**: Guides frontend implementation ensuring design token consistency, state completeness, accessibility compliance, and visual verification.
- **Workflow Highlights**:
  - **Design Token Foundations**: Uses standardized color tokens, typography scales, spacing units, and radius tokens.
  - **Component State Completeness**: Requires explicit handling of 5 UI states: *Initial/Idle*, *Loading/Pending*, *Success/Data*, *Empty State*, and *Error/Retry State*.
  - **Accessibility (a11y)**: Enforces WCAG 2.1 AA compliance, keyboard navigation focus indicators, and semantic HTML elements.
  - **Visual & Layout Resilience**: Checks responsive layout across mobile, tablet, and desktop breakpoints without horizontal overflow.

### 5. `verification`
- **Frontmatter**: `name: verification`
- **Purpose**: Systemic quality gate verifying changes across unit tests, deterministic edge cases, security audits, and release checklists.
- **Workflow Highlights**:
  - **5-Layer Pyramid**: Unit tests -> Integration tests -> Edge cases -> Security & Data Leakage -> Release Gate.
  - **Test Determinism**: Forbids arbitrary `sleep()` delays or flaky asynchronous polling.
  - **Zero Data Leakage**: Verifies that no API keys, credentials, or local environment paths are committed to version control.

### 6. `fullstack-integration`
- **Frontmatter**: `name: fullstack-integration`
- **Purpose**: Coordinates cross-layer features spanning client UI and server backend without contract drift or asymmetrical assumptions.
- **Workflow Highlights**:
  - **Contract-First Design**: Formalizes API contracts in `api-contracts.md` before writing implementation code.
  - **Implementation Sequencing**: Phase A (Backend route / stub) -> Phase B (Client API service) -> Phase C (UI integration).
  - **Boundary State Synchronization**: Coordinates optimistic updates, field-level validation errors, and session revocation.
  - **End-to-End Verification**: Verifies full round-trip workflows from user interaction to database persistence.

### 7. `video-motion`
- **Frontmatter**: `name: video-motion`
- **Purpose**: Engine-independent workflow for programmatic video composition, motion design, timeline planning, and quality control.
- **Workflow Highlights**:
  - **Creative Brief & Storyboarding**: Structures narrative arc and frame-accurate timeline planning in `storyboard.md`.
  - **Pacing & Typography Guidelines**: Adaptable baselines for safe title areas, reading time pacing, and audio ducking.
  - **Tooling Boundary Transparency**: Enforces explicit distinction between architectural storyboard planning and actual engine execution (e.g. Remotion, FFmpeg).
  - **QC & Delivery Checklist**: Pre- and post-render validation using `video-qc-checklist.md`.

---

## Engineering Standards Rules

Vibe Kit installs strict engineering standards formatted as markdown rules with `trigger: always_on` to ensure unconditional enforcement by AI agents.

### Workspace Rule (`.agents/rules/engineering-standards.md`)
Installed during `workspace` scope. Enforces:
- **Core Philosophy**: Understand existing code first; plan before writing large changes; keep diffs focused.
- **Code Quality**: Single responsibility principle; strict error propagation; descriptive variable names; no dead code.
- **Testing & Determinism**: Every feature must include automated tests; mock external dependencies deterministically.
- **Security**: Never commit secrets; validate all external input; sanitize SQL queries and shell commands.

### Global Rule (`~/.gemini/config/rules/vibe-kit-engineering-standards.md`)
Installed during `global` scope. Enforces cross-workspace guidelines for users utilizing Antigravity across multiple disparate repositories.

---

## Living Documentation Templates (`docs/ai-workflow/`)

In workspace installations, Vibe Kit initializes a standardized documentation directory:

| Template | File | Purpose | Contributed By |
| :--- | :--- | :--- | :--- |
| **Project Context** | `PROJECT_CONTEXT.md` | Single source of truth for project vision, user roles, business rules, and constraints. | `core` |
| **Workflow Index** | `README.md` | Guidelines on maintaining and reading living documentation artifacts. | `core` |
| **Implementation Plan** | `plan.md` | Phased milestones, technical dependencies, acceptance criteria, and rollback triggers. | `core` |
| **Design System** | `design-system.md` | Design tokens, typography hierarchy, component patterns, and accessibility guidelines. | `role:frontend` |
| **API Contracts** | `api-contracts.md` | Endpoints, query parameters, payload schemas, headers, status codes, and error models. | `role:backend` |
| **Data Model** | `data-model.md` | Entity relationships, database schemas, field constraints, indexes, and migrations. | `role:backend` |
| **Architecture** | `architecture.md` | System topologies, subsystem boundaries, data flows, and cross-layer diagrams. | `role:fullstack` |
| **Storyboard Plan** | `storyboard.md` | Engine-independent scene breakdown, narrative pacing, and asset inventory. | `role:video-motion` |
| **Video QC Checklist** | `video-qc-checklist.md` | Quality control checklist for visual hierarchy, audio ducking, and technical export specs. | `role:video-motion` |

::: tip Modular Asset Merging
When adding new packs (e.g. `vibe-kit init --pack role:video-motion`), Vibe Kit installs the specific role skills and templates and merges them into your existing `.vibe-kit-manifest.json` without modifying or overwriting your previously customized files.
:::
