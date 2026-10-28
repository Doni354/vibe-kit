# Documentation Templates

This directory contains standardized templates for AI-assisted and team software engineering.

## Recommended Onboarding Sequence

1. **`PROJECT_CONTEXT.md`**: Fill this first. It serves as the primary operational context hub for both AI coding agents and human engineers.
2. **`architecture.md`**: Document high-level system boundaries, request lifecycles, and key architectural decision records (ADR).
3. **`data-model.md`**: Populate when working with persistent databases, schema migrations, or data integrity boundaries.
4. **`api-contracts.md`**: Populate for server endpoints, REST/GraphQL schemas, and external service contracts.
5. **`design-system.md`**: Populate if the project includes a frontend user interface.
6. **`plan.md`**: Copy or use this template for non-trivial tasks to define scope, acceptance criteria, and verification steps before editing code.

## Guiding Principles
- **Progressive Adoption**: Only populate the documents your project currently needs. Do not force empty documents on projects that do not use them.
- **Fact-Based Only**: Record only verified technical facts and approved design decisions. Never guess schemas or commit sensitive credentials.
