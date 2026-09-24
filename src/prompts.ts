import * as p from "@clack/prompts";
import type { Scope, TargetAgent, SkillItem } from "./types.js";

export async function promptScope(initialScope?: Scope): Promise<Scope> {
  if (initialScope) return initialScope;

  const choice = await p.select<Scope>({
    message: "Select installation scope:",
    options: [
      { value: "local", label: "Local workspace", hint: "./.agents/skills or ./.claude/skills" },
      { value: "global", label: "Global user directory", hint: "~/.agents/skills or ~/.claude/skills" },
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

export async function promptSkills(foundSkills: SkillItem[]): Promise<string[]> {
  if (foundSkills.length <= 1) {
    return foundSkills.map((s) => s.name);
  }

  const choices = await p.multiselect<string>({
    message: "Select skills to link:",
    options: foundSkills.map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.hasSkillMd ? "valid skill (SKILL.md present)" : "folder",
    })),
    required: true,
  });

  if (p.isCancel(choices)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return choices;
}
