# skill-installer

A simple, cross-platform CLI tool to install and symlink AI agent skills into `.agents` and `.claude` folders (globally in your home directory or locally in your workspace).

Works on Linux, macOS, and Windows.

---

## Features

- 🔗 **Symlink-based Installation**: Quickly link local skills into `.agents/skills` and/or `.claude/skills` without duplicating files.
- 🌐 **Global or Local Scope**:
  - `--global` / `-g`: Installs to user home directory (`~/.agents/skills`, `~/.claude/skills`).
  - `--local` / `-l`: Installs to workspace root directory (`./.agents/skills`, `./.claude/skills`).
- 🤖 **Target Selection**:
  - `--generic`: Install into `.agents` folder.
  - `--claude`: Install into `.claude` folder.
- 💬 **Interactive Mode**: If flags are omitted, presents an interactive questionnaire to guide you through scope and target selections.
- 🪟 **Cross-Platform**: Uses standard Unix symlinks on Linux/macOS and Directory Junctions on Windows (no Administrator privileges required).
- 🔄 **Force & Unlink Support**: Re-link existing skills with `--force` or remove installed symlinks with `--unlink`.

---

## Installation

### Run directly with `npx`
```bash
npx skill-installer
```

### Or install globally via `npm`
```bash
npm install -g skill-installer
```

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
