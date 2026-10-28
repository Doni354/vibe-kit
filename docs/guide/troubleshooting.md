# Troubleshooting & FAQ

Solutions and answers to common questions when working with Vibe Kit.

---

## Frequently Asked Questions

### What is the difference between updating the CLI and running `vibe-kit update`?

- **`npm update -g @doni354/vibe-kit`**: Updates the Vibe Kit binary and toolkit package installed on your computer.
- **`vibe-kit update`**: Updates the workflow files (`.agents/skills`, `.agents/rules`, `docs/ai-workflow/`) inside your current project workspace.

After updating the CLI globally, run `vibe-kit update` in your workspace so your project benefits from the latest skill instructions and templates.

---

### Does `vibe-kit init` touch my existing code?

**No.** Vibe Kit strictly installs workflow assets into `.agents/` and `docs/ai-workflow/`. It never creates, alters, or removes your application source code, configuration files (`package.json`, `tsconfig.json`), or git history.

---

### Can I customize the installed skills and templates?

**Yes!** Once installed, the files belong to your project. You can edit `.agents/rules/engineering-standards.md` to add team-specific rules, or fill in `docs/ai-workflow/PROJECT_CONTEXT.md` with your business logic. 

When you later run `vibe-kit update`, Vibe Kit detects that your files have been customized (via SHA-256 hash comparison) and will **never overwrite them silently**.

---

## Troubleshooting Common Issues

### 1. Command Not Found: `vibe-kit: command not found`

**Cause:** The global npm bin directory is not in your system's `PATH` environment variable.

**Solutions:**
- **Alternative without installation**: Use `npx`:
  ```bash
  npx @doni354/vibe-kit init
  ```
- **Fix PATH on Windows**:
  1. Find your global npm path:
     ```powershell
     npm prefix -g
     # Usually: C:\Users\<Username>\AppData\Roaming\npm
     ```
  2. Add that path to your User Environment Variables under `Path`.
  3. Restart your terminal.
- **Fix PATH on macOS / Linux**:
  Add npm bin to your `~/.bashrc` or `~/.zshrc`:
  ```bash
  export PATH="$(npm prefix -g)/bin:$PATH"
  ```

---

### 2. Node.js Version Error (`engine >= 18`)

**Symptom:** The CLI fails with syntax errors or `vibe-kit doctor` outputs:
`[FAIL] Versi Node.js (v16.x) di bawah batas minimum >=18`

**Cause:** Vibe Kit uses modern ECMAScript modules (`import`), top-level await, and native Node.js crypto/file APIs that require Node.js 18 or newer.

**Solution:**
Update your Node.js version using your preferred version manager:
```bash
# Using nvm
nvm install 20
nvm use 20

# Verify version
node --version
```

---

### 3. File Conflicts During Update or Init

**Symptom:** You receive prompt `File sudah ada:` or `[CONFLICT - USER MODIFIED]`.

**Solutions:**
- **Keep your version (default)**: Choose `keep`. Vibe Kit leaves your customized file untouched and records its current hash in the manifest.
- **Backup and replace**: Choose `replace` or run with `--conflict replace`. Vibe Kit creates a backup named `<file>.backup-<timestamp>` before installing the new toolkit version.
- **Preview before applying**: Run with `--dry-run`:
  ```bash
  vibe-kit update --dry-run
  ```

---

### 4. User-Deleted Files Being Skipped

**Symptom:** You intentionally deleted a template (e.g., `docs/ai-workflow/design-system.md`), but `vibe-kit update` outputs:
`[SKIPPED - USER DELETED] docs/ai-workflow/design-system.md`

**Cause:** Vibe Kit respects user deletions and will not resurrect deleted files during routine updates.

**Solution:**
If you want to restore deleted files from the toolkit, use the `--force` flag:
```bash
vibe-kit update --force
```

---

### 5. Manifest Errors or Corrupt `.vibe-kit-manifest.json`

**Symptom:** `vibe-kit update` outputs:
`Manifest korup atau tidak valid di ... Proses update dihentikan demi keamanan data.`

**Cause:** The `.vibe-kit-manifest.json` file was manually edited with invalid JSON syntax.

**Solution:**
1. Run `vibe-kit doctor` to inspect the exact JSON parsing error.
2. Fix the syntax in `.vibe-kit-manifest.json` (ensure valid commas, quotes, and brackets).
3. If the manifest cannot be recovered, re-run `vibe-kit init --yes` to generate a fresh valid manifest.

---

### 6. Antigravity Diagnostics Report `FAIL` for Symlinks

**Symptom:** `vibe-kit doctor` reports:
`[FAIL] Workspace agents direktori (.agents) merupakan link yang mengarah ke luar target`

**Cause:** Your `.agents` directory is a symbolic link or junction pointing outside the target project directory.

**Solution:**
For security and isolation, Vibe Kit strictly prevents symbolic links that escape the project workspace root. Replace the symlink with a physical `.agents` directory inside your project.
