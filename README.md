# skill-installer

A simple, cross-platform CLI tool to install and symlink AI agent skills into `.agents` and `.claude` folders (globally in your home directory or locally in your workspace).

Works on Linux, macOS, and Windows.

---

## Features

- 📋 **Local Copies & Global Symlinks**:
  - `--local` / `-l`: Copies skill folders into local workspace directory (`./.agents/skills`, `./.claude/skills`).
  - `--global` / `-g`: Symlinks skill folders to global home directory (`~/.agents/skills`, `~/.claude/skills`).
- 🤖 **Target Selection**:
  - `--generic`: Install into `.agents` folder.
  - `--claude`: Install into `.claude` folder.
- 💬 **Interactive Mode**: If options are omitted, prompts for installation scope, target agents, and source directory (defaulting to the current working directory). Already installed valid skills are preselected; unselecting one removes it when you submit. Installed entries missing `SKILL.md` or `SKILLS.md` appear in a separate cleanup group.
- 📂 **Source Directory Override**: Interactively specify or use `--source <path>` (`-s <path>`) to scan any directory for skills.
- 🪟 **Cross-Platform**: Uses standard Unix symlinks on Linux/macOS and Directory Junctions on Windows (no Administrator privileges required).
- 🔄 **Force & Unlink Support**: Re-link existing skills with `--force` or remove installed symlinks with `--unlink`.

---

## Installation

### Install the latest GitHub Release

Bash:

```bash
curl --fail --location --remote-name \
  https://github.com/HarmanKhangura/skill-installer/releases/latest/download/install.sh
bash install.sh
rm install.sh
```

PowerShell:

```powershell
Invoke-WebRequest `
  https://github.com/HarmanKhangura/skill-installer/releases/latest/download/install.ps1 `
  -OutFile install.ps1
.\install.ps1
Remove-Item install.ps1
```

Both scripts verify the release archive's SHA-256 checksum before installing it globally. To install a specific release, append its tag (for example, `bash install.sh v1.0.0` or `.\install.ps1 -Version v1.0.0`).

### Run from GitHub with `npx`
```bash
npx --yes --allow-git=all github:HarmanKhangura/skill-installer
```

npm 12 disables fetching Git-based packages by default. The `--allow-git=all` option permits Git package fetching for this command; use it only with trusted sources.

### Clone and link globally
```bash
git clone https://github.com/HarmanKhangura/skill-installer.git
cd skill-installer
npm install
npm link
```

After linking, run `skill-installer` from any directory. The global command remains linked to this clone, so pull changes and rerun `npm install` when you want to update it.

---

## Usage

### Interactive Mode
Run `skill-installer` in any directory containing skills or a `skills/` folder:
```bash
skill-installer
```
If `--global`/`--local` or `--generic`/`--claude` flags are not specified, you will be prompted interactively.

### Non-Interactive CLI Options

#### Install to Local Workspace
```bash
# Link all skills in current directory into ./.agents/skills and ./.claude/skills
skill-installer --local --generic --claude

# Link skills into .agents folder only
skill-installer --local --generic
```

#### Install to Global Home Directory
```bash
# Link skills into ~/.agents/skills and ~/.claude/skills
skill-installer --global --generic --claude
```

#### Specify Source Folder
```bash
# Link skills from a specific source directory
skill-installer --global --generic --claude --source ./my-custom-skills
```

#### Overwrite Existing Symlinks
```bash
skill-installer --local --generic --claude --force
```

#### Remove Installed Symlinks
```bash
skill-installer --local --generic --claude --unlink
```

---

## CLI Options

| Flag | Short | Description |
| --- | --- | --- |
| `--global` | `-g` | Install skills to global home directory (`~/...`) |
| `--local` | `-l` | Install skills to local workspace directory (`./...`) |
| `--generic` | | Target `.agents` folder (`.agents/skills`) |
| `--claude` | | Target `.claude` folder (`.claude/skills`) |
| `--source <path>`| `-s` | Source folder containing skills (defaults to CWD) |
| `--force` | `-f` | Overwrite existing links/files if present |
| `--unlink` | `-u` | Remove skill symlinks instead of installing |
| `--dry-run` | | Preview link operations without making changes |
| `--non-interactive` | | Disable interactive prompts |
| `--help` | `-h` | Display CLI help documentation |
| `--version` | `-v` | Display version |

---

## License

[MIT](./LICENSE)
