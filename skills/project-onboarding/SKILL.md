---
name: project-onboarding
description: Onboards a new or existing repository. Audits the codebase, classifies project state, identifies constraints and acceptance criteria, and formulates a safe incremental plan. Use when starting a project, resuming an ongoing project, or clarifying requirements.
---

# Project Onboarding & Discovery

Use this workflow to establish context and alignment before writing or modifying any application code.

## 1. Classify the Project Context

Before taking any action, determine the project archetype:

- **Greenfield Project (New)**: No meaningful application code or business logic exists yet. Focus on clarifying requirements, user journeys, stack choices, module boundaries, and minimal scaffolding.
- **Ongoing / Existing Project**: An established codebase, conventions, dependencies, and git history already exist. Respect existing architecture, code style, frameworks, and testing patterns. **Never force new directories, scaffolds, or broad refactors unless explicitly requested.**
- **Ambiguous / Monorepo**: Inspect configuration manifests, workspace files, and directory structure to understand package boundaries before proceeding.

## 2. Read-Only Discovery Pass

Perform an evidence-based audit without modifying project files:

1. **Manifests & Configs**: Inspect package manifests (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.), lockfiles, build configuration, and tooling configs (linter, tsconfig, formatter).
2. **Repository Structure**: Map top-level directories, entry points (e.g. `src/index`, `cmd/main`, `app/page`), controllers/routes, and data schemas.
3. **Environment & Secrets**: Review `.env.example` or sample environment configurations for required variable names. **Never read, log, or commit actual secret values.**
4. **Existing Documentation**: Read project `README.md`, existing docs in `docs/`, and `docs/ai-workflow/PROJECT_CONTEXT.md` if installed.
5. **Baseline Verification Commands**: Identify how the project is installed, linted, typechecked, tested, and built. Check if existing tests currently pass or fail.

## 3. Planning & Requirements Formulation

Structure the task plan into concise, actionable criteria:

- **User & Goal**: What problem does this task solve, and for whom?
- **Scope Boundaries**: Explicitly define what is **Included** and what is **Excluded**.
- **Constraints & Trade-offs**: Note technical limitations (e.g. database versions, performance budgets, backwards compatibility).
- **Acceptance Criteria**: Formulate verifiable criteria (testable conditions of satisfaction).
- **Open Questions & Unknowns**: List unresolved ambiguities. Ask for clarification rather than making speculative assumptions.

## 4. Incremental Roadmap & Safeguards

- Propose the smallest coherent implementation steps.
- Identify the exact files likely to be created or modified.
- Include a rollback and risk mitigation note for breaking changes or database operations.
- Obtain alignment before executing multi-file or architectural changes.
