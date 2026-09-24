import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Scope, TargetAgent, SkillItem } from "./types.js";

export function expandHome(filePath: string): string {
  if (filePath.startsWith("~") && (filePath.length === 1 || filePath[1] === "/" || filePath[1] === "\\")) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function getTargetDirectory(target: TargetAgent, scope: Scope, cwd: string = process.cwd()): string {
  const baseDir = scope === "global" ? os.homedir() : cwd;
  const folderName = target === "generic" ? ".agents" : ".claude";
  return path.join(baseDir, folderName, "skills");
}

export function findInstalledSkillNames(
  skills: SkillItem[],
  targets: TargetAgent[],
  scope: Scope,
  cwd: string = process.cwd()
): string[] {
  return skills
    .filter((skill) =>
      targets.some((target) => {
        const skillPath = path.join(getTargetDirectory(target, scope, cwd), skill.name);
        return fs.lstatSync(skillPath, { throwIfNoEntry: false }) !== undefined;
      })
    )
    .map((skill) => skill.name);
}

export function findSkillMarkdownFile(dirPath: string): string | null {
  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (lower === "skill.md" || lower === "skills.md") {
        const fullPath = path.join(dirPath, entry);
        if (fs.statSync(fullPath).isFile()) {
          return fullPath;
        }
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export function findSkills(sourcePath: string = process.cwd(), maxDepth: number = 4): SkillItem[] {
  const absoluteSource = path.resolve(expandHome(sourcePath));
  if (!fs.existsSync(absoluteSource)) {
    return [];
  }

  const stat = fs.statSync(absoluteSource);
  if (!stat.isDirectory()) {
    return [];
  }

  const skills: SkillItem[] = [];
  const visitedDirs = new Set<string>();

  function search(dir: string, currentDepth: number) {
    let realPath = dir;
    try {
      realPath = fs.realpathSync(dir);
    } catch {
      // Fallback if realpath fails
    }

    if (visitedDirs.has(realPath)) return;
    visitedDirs.add(realPath);

    const skillFile = findSkillMarkdownFile(dir);
    if (skillFile) {
      skills.push({
        name: path.basename(dir),
        path: dir,
        hasSkillMd: true,
      });
      // Do not recurse further inside a skill directory
      return;
    }

    if (currentDepth >= maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "build"
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        let isDir = entry.isDirectory();
        if (!isDir && entry.isSymbolicLink()) {
          try {
            isDir = fs.statSync(fullPath).isDirectory();
          } catch {
            isDir = false;
          }
        }

        if (isDir) {
          search(fullPath, currentDepth + 1);
        }
      }
    } catch {
      // Ignore permission or read errors
    }
  }

  search(absoluteSource, 0);

  // Disambiguate duplicate skill folder names if any
  const nameCounts = new Map<string, number>();
  for (const s of skills) {
    nameCounts.set(s.name, (nameCounts.get(s.name) || 0) + 1);
  }

  if (Array.from(nameCounts.values()).some((count) => count > 1)) {
    for (const s of skills) {
      if ((nameCounts.get(s.name) || 0) > 1) {
        const parentName = path.basename(path.dirname(s.path));
        s.name = `${parentName}/${s.name}`;
      }
    }
  }

  return skills;
}

export function createSymlink(
  targetPath: string,
  linkPath: string,
  options: { force?: boolean; dryRun?: boolean } = {}
): { status: "created" | "updated" | "skipped" | "failed"; message?: string } {
  const { force = false, dryRun = false } = options;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedLink = path.resolve(linkPath);

  if (!fs.existsSync(resolvedTarget)) {
    return { status: "failed", message: `Source path does not exist: ${resolvedTarget}` };
  }

  const parentDir = path.dirname(resolvedLink);

  if (fs.existsSync(resolvedLink) || fs.lstatSync(resolvedLink, { throwIfNoEntry: false })) {
    let existingTarget = "";
    let isSymlink = false;

    try {
      const lstat = fs.lstatSync(resolvedLink);
      isSymlink = lstat.isSymbolicLink();
      if (isSymlink) {
        existingTarget = path.resolve(parentDir, fs.readlinkSync(resolvedLink));
      }
    } catch {
      // Ignore readlink errors
    }

    if (isSymlink && existingTarget === resolvedTarget && !force) {
      return { status: "skipped", message: "Symlink already points to correct target" };
    }

    if (!force) {
      return {
        status: "failed",
        message: `Destination already exists at ${resolvedLink}. Use --force to overwrite.`,
      };
    }

    if (!dryRun) {
      try {
        fs.rmSync(resolvedLink, { recursive: true, force: true });
      } catch (err: any) {
        return { status: "failed", message: `Failed to remove existing file/link: ${err.message}` };
      }
    }
  }

  if (dryRun) {
    return { status: "created", message: "[Dry-run] Would create symlink" };
  }

  try {
    fs.mkdirSync(parentDir, { recursive: true });
    // On Windows, use 'junction' for directories to avoid administrator privilege requirement
    const symlinkType = process.platform === "win32" ? "junction" : "dir";
    fs.symlinkSync(resolvedTarget, resolvedLink, symlinkType);
    return { status: fs.existsSync(resolvedLink) ? "created" : "failed" };
  } catch (err: any) {
    return { status: "failed", message: `Symlink creation error: ${err.message}` };
  }
}

export function copyDirectory(
  targetPath: string,
  destPath: string,
  options: { force?: boolean; dryRun?: boolean } = {}
): { status: "created" | "updated" | "skipped" | "failed"; message?: string } {
  const { force = false, dryRun = false } = options;
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDest = path.resolve(destPath);

  if (!fs.existsSync(resolvedTarget)) {
    return { status: "failed", message: `Source path does not exist: ${resolvedTarget}` };
  }

  const parentDir = path.dirname(resolvedDest);

  if (fs.existsSync(resolvedDest) || fs.lstatSync(resolvedDest, { throwIfNoEntry: false })) {
    if (!force) {
      return {
        status: "skipped",
        message: `Destination directory already exists. Use --force to overwrite.`,
      };
    }

    if (!dryRun) {
      try {
        fs.rmSync(resolvedDest, { recursive: true, force: true });
      } catch (err: any) {
        return { status: "failed", message: `Failed to remove existing directory: ${err.message}` };
      }
    }
  }

  if (dryRun) {
    return { status: "created", message: "[Dry-run] Would copy directory" };
  }

  try {
    fs.mkdirSync(parentDir, { recursive: true });
    fs.cpSync(resolvedTarget, resolvedDest, { recursive: true });
    return { status: "created" };
  } catch (err: any) {
    return { status: "failed", message: `Copy error: ${err.message}` };
  }
}

export function removeSymlink(
  linkPath: string,
  options: { dryRun?: boolean } = {}
): { status: "removed" | "skipped" | "failed"; message?: string } {
  const { dryRun = false } = options;
  const resolvedLink = path.resolve(linkPath);

  const lstat = fs.lstatSync(resolvedLink, { throwIfNoEntry: false });
  if (!lstat) {
    return { status: "skipped", message: "Path does not exist" };
  }

  if (dryRun) {
    return { status: "removed", message: "[Dry-run] Would remove item" };
  }

  try {
    fs.rmSync(resolvedLink, { recursive: true, force: true });
    return { status: "removed" };
  } catch (err: any) {
    return { status: "failed", message: `Failed to remove path: ${err.message}` };
  }
}
