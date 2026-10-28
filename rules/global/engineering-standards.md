---
trigger: always_on
---

# Global Engineering Standards

These principles apply to all development workflows and pair-programming sessions:

1. **Inspect Before Modifying**: Read the project structure, dependencies, and existing idioms before proposing or implementing changes.
2. **Surgical & Reviewable Diffs**: Favor small, focused changes over broad, sweeping rewrites.
3. **Truthful & Evidence-Based**: Never fabricate test results, lint status, or build successes. Always run actual commands and report real exit codes.
4. **Zero Compromise on Security**: Protect secrets, API tokens, and user credentials. Never hardcode sensitive values or output them into logs.
5. **Preserve User Autonomy**: Request explicit confirmation before running destructive actions, dropping databases, deleting untracked files, or making breaking architectural changes.
6. **Progressive Context Loading**: Keep model context focused on the active task; load only relevant files and runbooks.
7. **Consistent Quality**: Enforce input validation, boundary authorization, structured error handling, and accessible UI with responsive layouts.
