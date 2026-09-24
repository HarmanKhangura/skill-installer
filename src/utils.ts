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

export function findSkills(sourcePath: string = process.cwd()): SkillItem[] {
  const absoluteSource = path.resolve(expandHome(sourcePath));
  if (!fs.existsSync(absoluteSource)) {
    return [];
  }

  const stat = fs.statSync(absoluteSource);
  if (!stat.isDirectory()) {
    return [];
  }

  // Check if current directory is itself a single skill containing SKILL.md
  const skillMdInCurrent = path.join(absoluteSource, "SKILL.md");
  if (fs.existsSync(skillMdInCurrent)) {
    return [
      {
        name: path.basename(absoluteSource),
        path: absoluteSource,
        hasSkillMd: true,
      },
    ];
  }

  // Check if a `skills` subfolder exists
  const skillsSubdir = path.join(absoluteSource, "skills");
  const searchDir = fs.existsSync(skillsSubdir) && fs.statSync(skillsSubdir).isDirectory()
    ? skillsSubdir
    : absoluteSource;

  const entries = fs.readdirSync(searchDir, { withFileTypes: true });
  const skills: SkillItem[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(searchDir, entry.name);
    // Follow symlinks if entry is a symlink to directory
    let isDir = entry.isDirectory();
    if (!isDir && entry.isSymbolicLink()) {
      try {
        isDir = fs.statSync(fullPath).isDirectory();
      } catch {
        isDir = false;
      }
    }

    if (isDir) {
      const hasSkillMd = fs.existsSync(path.join(fullPath, "SKILL.md"));
      skills.push({
        name: entry.name,
        path: fullPath,
        hasSkillMd,
      });
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

export function removeSymlink(
  linkPath: string,
  options: { dryRun?: boolean } = {}
): { status: "removed" | "skipped" | "failed"; message?: string } {
  const { dryRun = false } = options;
  const resolvedLink = path.resolve(linkPath);

  const lstat = fs.lstatSync(resolvedLink, { throwIfNoEntry: false });
  if (!lstat) {
    return { status: "skipped", message: "Link does not exist" };
  }

  if (dryRun) {
    return { status: "removed", message: "[Dry-run] Would remove symlink" };
  }

  try {
    fs.rmSync(resolvedLink, { recursive: true, force: true });
    return { status: "removed" };
  } catch (err: any) {
    return { status: "failed", message: `Failed to remove link: ${err.message}` };
  }
}
