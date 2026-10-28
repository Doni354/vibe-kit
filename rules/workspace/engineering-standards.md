---
trigger: always_on
---

# Workspace Engineering Standards

These standards govern all coding, refactoring, and documentation activities within this project:

1. **Context & Architecture First**: Inspect the repository, entry points, dependencies, and existing patterns before proposing changes. For ongoing projects, preserve the existing tech stack, design system, and code idioms unless a change is explicitly approved.
2. **Minimal & Coherent Changes**: Make the smallest coherent change that satisfies the acceptance criteria. Avoid sprawling edits, unsolicited dependency additions, or broad refactors that complicate review and risk regressions.
3. **Evidence-Based Veracity**: Never invent, guess, or claim that a test, build, lint check, or screenshot succeeded without actually executing the check and observing the result. Always report actual commands, exit codes, and output summaries.
4. **Strict Security & Privacy**: Never commit, copy, or log secrets, tokens, connection strings, or sensitive personal data. Sanitize all inputs at service boundaries and enforce authorization at the data layer.
5. **Safe Data Migrations**: Always design schema changes to be non-destructive and backwards-compatible. Ask before executing destructive commands, database drops, or irreversible operations.
6. **Polished UI & Accessibility**: Follow the existing design tokens (colors, typography, spacing). Always provide all component states (default, hover, focus-visible, disabled, loading, empty, error). Enforce semantic HTML5, keyboard navigability, and WCAG AA contrast.
7. **Focused Context**: Load only the documents, rules, and source files relevant to the active task. Do not load entire directories or unrelated documentation by default.
