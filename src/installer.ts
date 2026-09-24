import path from "node:path";
import type { InstallOptions, InstallResult, TargetAgent, Scope } from "./types.js";
import { findSkills, getTargetDirectory, createSymlink, copyDirectory, removeSymlink } from "./utils.js";

export function installSkills(options: InstallOptions): InstallResult[] {
  const scope: Scope = options.scope || "local";
  const targets: TargetAgent[] = options.targets && options.targets.length > 0
    ? options.targets
    : ["generic", "claude"];
  const sourcePath = options.sourcePath || process.cwd();
  const cwd = options.cwd || process.cwd();
  const force = options.force ?? false;
  const dryRun = options.dryRun ?? false;

  const foundSkills = findSkills(sourcePath);
  if (foundSkills.length === 0) {
    return [];
  }

  // Filter by requested skill names if specified
  const selectedSkills = options.skills && options.skills.length > 0
    ? foundSkills.filter((s) => options.skills!.includes(s.name))
    : foundSkills;

  const results: InstallResult[] = [];

  for (const target of targets) {
    const targetDir = getTargetDirectory(target, scope, cwd);

    for (const skill of selectedSkills) {
      const destPath = path.join(targetDir, skill.name);

      if (options.unlink) {
        const res = removeSymlink(destPath, { dryRun });
        results.push({
          skillName: skill.name,
          target,
          targetDir,
          linkPath: destPath,
          status: res.status,
          message: res.message,
        });
      } else {
        const res = scope === "local"
          ? copyDirectory(skill.path, destPath, { force, dryRun })
          : createSymlink(skill.path, destPath, { force, dryRun });

        results.push({
          skillName: skill.name,
          target,
          targetDir,
          linkPath: destPath,
          status: res.status,
          message: res.message,
        });
      }
    }
  }

  return results;
}

export function uninstallSkills(options: InstallOptions): InstallResult[] {
  const scope: Scope = options.scope || "local";
  const targets: TargetAgent[] = options.targets && options.targets.length > 0
    ? options.targets
    : ["generic", "claude"];
  const sourcePath = options.sourcePath || process.cwd();
  const cwd = options.cwd || process.cwd();
  const skillNames = options.skills && options.skills.length > 0
    ? options.skills
    : findSkills(sourcePath).map((skill) => skill.name);
  const dryRun = options.dryRun ?? false;
  const results: InstallResult[] = [];

  for (const target of targets) {
    const targetDir = getTargetDirectory(target, scope, cwd);

    for (const skillName of skillNames) {
      const linkPath = path.join(targetDir, skillName);
      const result = removeSymlink(linkPath, { dryRun });
      results.push({
        skillName,
        target,
        targetDir,
        linkPath,
        status: result.status,
        message: result.message,
      });
    }
  }

  return results;
}
