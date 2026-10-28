# Profiles & Workflow Assets

Vibe Kit provides a modular architecture allowing teams to install exactly the agent workflows and living documentation their projects require.

---

## Profile Matrix

The toolkit defines four distinct profiles in `lib/cli.js`:

| Profile | Target Project Type | Included Skills | Rules Installed | Templates Installed |
| :--- | :--- | :--- | :--- | :--- |
| **`base`** | Core libraries, CLI tools, scripts, utilities | `project-onboarding`<br>`documentation`<br>`verification` | Workspace rule | All 7 living templates |
| **`frontend`** | SPAs, UI component libraries, design systems, web apps | Base skills +<br>`ui-implementation` | Workspace rule | All 7 living templates |
| **`backend`** | APIs, microservices, database backends, serverless functions | Base skills +<br>`backend-feature` | Workspace rule | All 7 living templates |
| **`fullstack`** | Full-stack applications, monolithic apps, modern web platforms | All 5 skills | Workspace rule | All 7 living templates |

---

## The 5 Antigravity Skills

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

| Template | File | Purpose |
| :--- | :--- | :--- |
| **Project Context** | `PROJECT_CONTEXT.md` | Single source of truth for project vision, user roles, business rules, and tech stack constraints. |
| **Architecture** | `architecture.md` | System topologies, subsystem boundaries, data flows, and Mermaid diagrams. |
| **API Contracts** | `api-contracts.md` | Endpoints, query parameters, payload schemas, headers, status codes, and error models. |
| **Data Model** | `data-model.md` | Entity relationships, database schemas, field constraints, indexes, and migration plans. |
| **Design System** | `design-system.md` | Design tokens, typography hierarchy, component patterns, and accessibility guidelines. |
| **Implementation Plan** | `plan.md` | Step-by-step phased milestones, technical dependencies, acceptance criteria, and rollback triggers. |
| **Workflow Index** | `README.md` | Guidelines on maintaining and reading the living documentation artifacts. |

::: tip Re-Profile Merging
If you initially install the `base` profile and later re-run `vibe-kit init --profile fullstack`, Vibe Kit automatically detects the new skills (`backend-feature`, `ui-implementation`), installs them, and merges the new entries into your existing `.vibe-kit-manifest.json` without damaging previously existing files.
:::
