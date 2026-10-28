---
name: documentation
description: Creates, updates, or audits concise project documentation based on verified repository evidence. Use for architecture overviews, system context, API contracts, data models, ADRs, or project handoffs.
---

# Documentation & Knowledge Handoff

Use this workflow to maintain living, accurate documentation without generating unnecessary documentation bloat.

## 1. Living Documentation Principles

- **Evidence-Based**: Only document facts verified from actual source code, database schemas, test cases, or approved design decisions. Never record speculative designs as existing reality.
- **Concise & Hyperlinked**: Prefer small, modular markdown documents linked together over monolithic specifications. Use `docs/ai-workflow/PROJECT_CONTEXT.md` as the central hub.
- **Never Overwrite Silently**: Check if a documentation file already contains user-written content before updating. Present diffs and confirm before replacing established docs.
- **Zero Secrets**: Never include real credentials, API tokens, connection strings, private keys, or personal data in documentation. Use generic placeholders (e.g. `YOUR_API_KEY`).

## 2. Architecture & Design Documentation

When updating `docs/ai-workflow/architecture.md`:
- **Module Boundaries**: Document major components and their respective responsibilities.
- **Data Flow & Lifecycle**: Detail how requests originate, how they are authenticated, processed, persisted, and returned.
- **Trust Boundaries**: Identify external integrations, third-party APIs, and authentication boundaries.
- **Architectural Decisions (ADR)**: Record key decisions, alternatives considered, trade-offs, and current status.

## 3. Data Models & API Contracts

- **Data Models (`data-model.md`)**:
  - Document entities, primary keys, indexes, foreign relations, validation constraints, and cascade behaviors.
  - Detail migration safety rules, backward compatibility considerations, and data ownership boundaries.
- **API Contracts (`api-contracts.md`)**:
  - Document HTTP method, route, URL parameters, request body schemas, and headers.
  - Detail authentication requirements, role authorization, and rate limiting.
  - Include exact success response schemas (status code + JSON body) and expected error codes (400, 401, 403, 404, 409, 422, 500).

## 4. Operational Handoff

Maintain operational clarity in `PROJECT_CONTEXT.md` for both human developers and subsequent agent sessions:
- Exact commands to install dependencies, run dev servers, execute lint/typecheck, and run tests.
- Current active task, completed milestones, and immediate next steps.
- Known technical debts, production risks, and unanswered questions.
