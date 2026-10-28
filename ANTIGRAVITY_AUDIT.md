# Antigravity audit brief — Vibe Kit

Use this document as the task brief when opening this repository in Google Antigravity. The goal is to audit and improve the existing implementation, not blindly rewrite it.

## Product intent

Vibe Kit (`@doni354/vibe-kit`, CLI `vibe-kit`) is a developer-installed toolkit for end-to-end AI-assisted software development. It should help a coding agent work through project discovery, requirements, architecture, implementation, UI quality, testing/verification, and documentation. The current implementation is an early prototype adapted from a prior CLI and is not release-ready by default.

## Rules for the audit

1. Read `README.md`, `package.json`, all files under `bin/`, `lib/`, `skills/`, `rules/`, and `templates/` before making changes.
2. Do not publish to npm, create remote repositories, push commits, or run destructive commands.
3. Do not modify files outside this repository.
4. Preserve the product naming: npm package `@doni354/vibe-kit`, command `vibe-kit`, intended repository `doni354/vibe-kit` unless a concrete technical or registry constraint requires proposing a change first.
5. Before large changes, report findings and a prioritized plan. You may implement low-risk fixes after describing them, but do not conceal behavior changes.
6. Add automated tests for every corrected behavior. Use Node's built-in test runner unless there is a compelling reason to add a dependency.
7. Do not add runtime dependencies without explaining why; prefer Node.js built-ins for filesystem and CLI operations.

## Audit checklist

### CLI and argument parsing
- Validate command parsing, unknown flags, missing flag values, invalid profile/scope values, `--yes`, and `--dry-run` behavior.
- Ensure `--dry-run` performs no writes, creates no directories/manifests, and never prompts for destructive actions.
- Ensure paths with spaces and Windows path separators work.
- Ensure `init` does not accidentally install into the toolkit repository or unsafe parent/child locations.
- Ensure errors are clear and exit codes are non-zero for failures.

### Installation and conflict safety
- Confirm the asset list contains only intended package files and every source asset exists before writing any destination files (avoid partial installs on missing assets).
- Existing files must be preserved unless the user explicitly selects replacement. Backups must not overwrite existing backups.
- Check whether installation should be transactional or how partial failures should be rolled back/reported.
- Ensure manifest updates merge prior tracked paths correctly and do not silently lose records from earlier installs.
- Prevent path traversal or manifest paths escaping the intended target, especially during uninstall.
- Uninstall should not delete a file that the user has modified since installation without an explicit warning/confirmation; consider recording hashes at install time.
- Global install/uninstall paths must be consistent and clearly documented.

### Update semantics
- Clearly distinguish reapplying bundled workflow assets from updating the npm package itself.
- Do not implement a remote updater that executes downloaded code. Prefer documenting `npm update -g @doni354/vibe-kit` for CLI package upgrades.
- Consider a safe diff/preview mode before replacing changed templates.

### Antigravity compatibility
- Verify current official Antigravity conventions for workspace skills, rules, and global/user-level skills. Do not assume `.agents/skills` or `~/.gemini/config/skills` are correct without checking.
- Check naming/metadata requirements for skill files and whether rule files are discovered from `.agents/rules`.
- Separate confirmed behavior from assumptions in documentation.

### Quality of workflow assets
- Review each skill for actionable instructions, scope boundaries, expected inputs/outputs, and verification steps.
- Make the workflow end-to-end without forcing every task through unnecessary documentation or ceremony.
- Improve UI skill with responsive behavior, accessibility, design tokens, visual regression/review, loading/empty/error states, and consistency checks.
- Improve backend skill with API contracts, authorization, validation, error handling, logging, data model/migrations, and security considerations.
- Ensure project onboarding asks the agent to inspect existing code before proposing changes and avoids destructive rewrites.
- Ensure verification guidance requests actual tests/commands and honest reporting rather than claiming tests passed without evidence.
- Make templates useful, concise, and adaptable to existing projects.

### Package readiness
- Review package metadata, license, npm `files` allowlist, shebang/executable behavior, and README commands.
- Check `npm pack --dry-run`, install from generated tarball into a clean test environment, and exercise all commands.
- Add tests and document supported Node.js/platform versions.
- Do not mark the project release-ready until Windows testing and package/Antigravity path checks have passed.

## Required output from the audit

1. A concise findings report sorted by severity: critical, high, medium, low.
2. A list of confirmed compatibility facts and unresolved assumptions.
3. A prioritized remediation plan.
4. Code fixes and automated tests for approved low-risk issues.
5. A final test report with exact commands run, pass/fail results, and any tests that could not be performed in this environment.
6. A release-readiness verdict with explicit blockers. Do not publish anything.
