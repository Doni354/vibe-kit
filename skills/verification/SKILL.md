---
name: verification
description: Verifies code quality, functionality, and regressions using risk-based multi-tier testing, debugging, and honest reporting. Use before completing tasks, creating pull requests, or refactoring.
---

# Verification, Testing & Debugging

Use this workflow to ensure code correctness, prevent regressions, and diagnose issues with evidence-based rigor.

## 1. Multi-Tier Risk-Based Verification

Select verification checks proportionally to the scope and risk of the changes:

1. **Static Analysis & Type Checking**:
   - Run linters (e.g. ESLint, Biome, golangci-lint, flake8) and formatters.
   - Run typecheckers (e.g. `tsc --noEmit`, mypy, pyright) to catch type mismatches and missing imports early.
2. **Targeted Unit & Component Tests**:
   - Run unit tests specifically covering the modified files, functions, or UI components.
   - Test edge cases: null/undefined inputs, boundary numbers, empty arrays, duplicate entries, and invalid payload formats.
3. **Integration & Build Checks**:
   - Run integration tests covering API endpoints, database interactions, or service boundaries.
   - Run project build commands (e.g. `npm run build`, `go build`, `cargo check`) to ensure production bundling and assets compile cleanly.
4. **Runtime & Smoke Verification**:
   - For web services: verify health check endpoints or curl responses.
   - For UI changes: inspect rendered markup or visual output across viewports.

## 2. Root Cause Analysis & Debugging

When investigating defects or test failures:
- **Reproduce First**: Write or identify a minimal reproducing test case before changing production code.
- **Isolate the Root Cause**: Trace logs, stack traces, and variable states rather than guessing or applying random patches.
- **Surgical Diffs**: Fix only the root cause. Avoid broad, unsolicited refactors or unrelated code cleanup that could introduce subtle regressions.
- **Distinguish Regressions from Pre-Existing Issues**: Compare failure patterns against git history or unedited files when feasible.

## 3. Evidence-Based & Honest Reporting

Never guess, hallucinate, or falsely claim a check passed without running it:
- **Cite Actual Commands & Results**: For each check performed, report:
  - Exact command executed (e.g. `npm test -- test/auth.test.js`).
  - Actual exit code observed (`0` for success, non-zero for failure).
  - Summary of test counts (e.g. `24 passed, 0 failed`).
- **Handle Missing Tools Transparently**: If a command or tool cannot be executed in the current environment (e.g. missing Docker daemon, no display server, missing API keys), explicitly explain why, report the check as `SKIPPED / UNAVAILABLE`, and provide the exact command for the developer to run manually.
