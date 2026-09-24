import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { InvalidInstalledSkill, Scope, TargetAgent, SkillItem } from "./types.js";

export async function promptScope(initialScope?: Scope): Promise<Scope> {
  if (initialScope) return initialScope;

  const choice = await p.select<Scope>({
    message: "Select installation scope:",
    options: [
      { value: "local", label: "Local workspace", hint: "Copies skills to ./.agents/skills or ./.claude/skills" },
      { value: "global", label: "Global user directory", hint: "Symlinks skills to ~/.agents/skills or ~/.claude/skills" },
    ],
  });

  if (p.isCancel(choice)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return choice;
}

export async function promptTargets(initialTargets?: TargetAgent[]): Promise<TargetAgent[]> {
  if (initialTargets && initialTargets.length > 0) return initialTargets;

  const choices = await p.multiselect<TargetAgent>({
    message: "Select target skill locations to install into:",
    options: [
      { value: "generic", label: ".agents (Generic skills)", hint: "Installs to .agents/skills" },
      { value: "claude", label: ".claude (Claude skills)", hint: "Installs to .claude/skills" },
    ],
    required: true,
  });

  if (p.isCancel(choices)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return choices;
}

export async function promptSkills(
  foundSkills: SkillItem[],
  initiallySelected: string[] = [],
  invalidInstalledSkills: InvalidInstalledSkill[] = []
): Promise<{ selectedSkillNames: string[]; invalidSkillsToRemove: InvalidInstalledSkill[] }> {
  const skillValues = foundSkills.map((_, index) => `skill-${index}`);
  const invalidSkillValues = invalidInstalledSkills.map((_, index) => `invalid-${index}`);
  const initiallySelectedSet = new Set(initiallySelected);
  const options: Record<string, { value: string; label: string; hint?: string }[]> = {};

  if (foundSkills.length > 0) {
    options["Available skills"] = foundSkills.map((skill, index) => ({
      value: skillValues[index],
      label: skill.name,
      hint: initiallySelectedSet.has(skill.name)
        ? "installed"
        : skill.hasSkillMd
          ? "valid skill (SKILL.md present)"
          : "folder",
    }));
  }

  if (invalidInstalledSkills.length > 0) {
    options["Invalid installed skills (select to remove)"] = invalidInstalledSkills.map((skill, index) => ({
      value: invalidSkillValues[index],
      label: `${skill.name} (${skill.target === "generic" ? ".agents" : ".claude"})`,
      hint: "missing SKILL.md or SKILLS.md",
    }));
  }

  const choices = await p.groupMultiselect<string>({
    message: "Select skills to install or keep; select invalid installed skills to remove:",
    options,
    initialValues: foundSkills.flatMap((skill, index) =>
      initiallySelectedSet.has(skill.name) ? [skillValues[index]] : []
    ),
    required: false,
  });

  if (p.isCancel(choices)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return {
    selectedSkillNames: foundSkills.flatMap((skill, index) =>
      choices.includes(skillValues[index]) ? [skill.name] : []
    ),
    invalidSkillsToRemove: invalidInstalledSkills.filter((_, index) =>
      choices.includes(invalidSkillValues[index])
    ),
  };
}

export async function promptSourceDirectory(initialSource?: string): Promise<string> {
  if (initialSource) return initialSource;

  const value = await p.text({
    message: "Specify source directory containing skills:",
    placeholder: "./ (current directory)",
    defaultValue: ".",
    validate(val) {
      const pathToCheck = val ? val.trim() : ".";
      const resolved = pathToCheck.startsWith("~")
        ? path.join(os.homedir(), pathToCheck.slice(1))
        : path.resolve(pathToCheck);
      if (!fs.existsSync(resolved)) {
        return `Directory "${pathToCheck}" does not exist`;
      }
    },
  });

  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return value ? value.trim() : ".";
}
