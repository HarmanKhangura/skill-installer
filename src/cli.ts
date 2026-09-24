import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import path from "node:path";
import fs from "node:fs";
import { installSkills } from "./installer.js";
import { findSkills, expandHome } from "./utils.js";
import { promptScope, promptTargets, promptSkills, promptSourceDirectory } from "./prompts.js";
import type { Scope, TargetAgent } from "./types.js";

const program = new Command();

program
  .name("skill-installer")
  .description("CLI tool to install skills into .agents and/or .claude folders via symbolic links")
  .version("1.0.0")
  .option("-g, --global", "Install skills to global home directory (~/.agents/skills or ~/.claude/skills)")
  .option("-l, --local", "Install skills to local workspace directory (./.agents/skills or ./.claude/skills)")
  .option("--generic", "Install skills into .agents folder")
  .option("--claude", "Install skills into .claude folder")
  .option("-s, --source <path>", "Source directory containing skills (default: current directory or ./skills)")
  .option("-f, --force", "Overwrite existing links or files if present", false)
  .option("-u, --unlink", "Remove skill links instead of installing", false)
  .option("--dry-run", "Preview link operations without making changes", false)
  .option("--non-interactive", "Disable interactive prompts", false)
  .action(async (options) => {
    p.intro(pc.cyan("skill-installer CLI"));

    // Check mutually exclusive scope flags
    if (options.global && options.local) {
      p.log.error(pc.red("Flags --global and --local are mutually exclusive. Please specify only one."));
      process.exit(1);
    }

    let scope: Scope | undefined = undefined;
    if (options.global) scope = "global";
    if (options.local) scope = "local";

    const targets: TargetAgent[] = [];
    if (options.generic) targets.push("generic");
    if (options.claude) targets.push("claude");

    const nonInteractive = options.nonInteractive || !process.stdout.isTTY;

    if (!scope) {
      if (nonInteractive) {
        p.log.error(pc.red("Missing scope flag (--global or --local) in non-interactive mode."));
        process.exit(1);
      }
      scope = await promptScope();
    }

    if (targets.length === 0) {
      if (nonInteractive) {
        p.log.error(pc.red("Missing target flag (--generic or --claude) in non-interactive mode."));
        process.exit(1);
      }
      const selectedTargets = await promptTargets();
      targets.push(...selectedTargets);
    }

    let sourcePathInput = options.source;
    if (!sourcePathInput && !nonInteractive) {
      sourcePathInput = await promptSourceDirectory();
    }

    const sourcePath = expandHome(sourcePathInput || process.cwd());
    const foundSkills = findSkills(sourcePath);

    if (foundSkills.length === 0) {
      p.log.warn(pc.yellow(`No skill folders found in source directory: ${path.resolve(sourcePath)}`));
      p.outro("Done");
      process.exit(0);
    }

    let selectedSkillNames: string[] = [];
    if (foundSkills.length > 1 && !nonInteractive) {
      selectedSkillNames = await promptSkills(foundSkills);
    } else {
      selectedSkillNames = foundSkills.map((s) => s.name);
    }

    const actionText = options.unlink ? "Unlinking" : "Installing";
    p.log.info(`${actionText} ${selectedSkillNames.length} skill(s) from [${pc.bold(path.resolve(sourcePath))}] into scope [${pc.bold(scope)}] for targets [${targets.join(", ")}]...`);

    const results = installSkills({
      scope,
      targets,
      sourcePath,
      skills: selectedSkillNames,
      force: options.force,
      unlink: options.unlink,
      dryRun: options.dryRun,
    });

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const res of results) {
      const targetLabel = pc.magenta(`[${res.target}]`);
      const skillLabel = pc.bold(res.skillName);

      if (res.status === "created" || res.status === "updated" || res.status === "removed") {
        successCount++;
        const icon = options.unlink ? "🗑" : "✔";
        p.log.success(`${icon} ${targetLabel} ${skillLabel} ➜ ${res.linkPath}`);
      } else if (res.status === "skipped") {
        skipCount++;
        p.log.info(`ℹ ${targetLabel} ${skillLabel}: ${res.message || "already linked"}`);
      } else {
        failCount++;
        p.log.error(`✖ ${targetLabel} ${skillLabel}: ${res.message || "operation failed"}`);
      }
    }

    if (failCount > 0) {
      p.outro(pc.red(`Finished with ${failCount} failure(s), ${successCount} successful, ${skipCount} skipped.`));
      process.exit(1);
    } else {
      p.outro(pc.green(`Successfully processed ${successCount} skill link(s) (${skipCount} skipped).`));
    }
  });

program.parse(process.argv);
