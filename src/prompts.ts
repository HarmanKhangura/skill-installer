import * as p from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Scope, TargetAgent, SkillItem } from "./types.js";

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
  initiallySelected: string[] = []
): Promise<string[]> {
  const choices = await p.multiselect<string>({
    message: "Select skills to install or keep (uncheck installed skills to remove them):",
    options: foundSkills.map((s) => ({
      value: s.name,
      label: s.name,
      hint: initiallySelected.includes(s.name)
        ? "installed"
        : s.hasSkillMd
          ? "valid skill (SKILL.md present)"
          : "folder",
    })),
    initialValues: initiallySelected,
    required: false,
  });

  if (p.isCancel(choices)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return choices;
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
