import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { installSkills, uninstallSkills } from "../src/installer.js";
import { findSkills, getTargetDirectory } from "../src/utils.js";

const TEST_DIR = path.join(os.tmpdir(), "skill-installer-tests-" + Date.now());
const SOURCE_SKILLS_DIR = path.join(TEST_DIR, "my-skills");

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(SOURCE_SKILLS_DIR, "skill-a"), { recursive: true });
  fs.writeFileSync(path.join(SOURCE_SKILLS_DIR, "skill-a", "SKILL.md"), "# Skill A");

  fs.mkdirSync(path.join(SOURCE_SKILLS_DIR, "skill-b"), { recursive: true });
  fs.writeFileSync(path.join(SOURCE_SKILLS_DIR, "skill-b", "SKILL.md"), "# Skill B");
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("skill-installer utils & installer", () => {
  it("should discover skills in a source directory", () => {
    const skills = findSkills(SOURCE_SKILLS_DIR);
    expect(skills.length).toBe(2);
    expect(skills.map((s) => s.name).sort()).toEqual(["skill-a", "skill-b"]);
  });

  it("should generate correct target directories", () => {
    const localAgents = getTargetDirectory("generic", "local", TEST_DIR);
    expect(localAgents).toBe(path.join(TEST_DIR, ".agents", "skills"));

    const localClaude = getTargetDirectory("claude", "local", TEST_DIR);
    expect(localClaude).toBe(path.join(TEST_DIR, ".claude", "skills"));
  });

  it("should install skills as symlinks into local .agents and .claude folders", () => {
    const results = installSkills({
      scope: "local",
      targets: ["generic", "claude"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
    });

    expect(results.length).toBe(4); // 2 skills * 2 targets
    expect(results.every((r) => r.status === "created")).toBe(true);

    const agentSkillA = path.join(TEST_DIR, ".agents", "skills", "skill-a");
    const claudeSkillB = path.join(TEST_DIR, ".claude", "skills", "skill-b");

    expect(fs.existsSync(agentSkillA)).toBe(true);
    expect(fs.existsSync(claudeSkillB)).toBe(true);

    expect(fs.lstatSync(agentSkillA).isSymbolicLink()).toBe(true);
    expect(fs.lstatSync(claudeSkillB).isSymbolicLink()).toBe(true);
  });

  it("should handle force overwrite of existing links", () => {
    installSkills({
      scope: "local",
      targets: ["generic"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
    });

    // Attempt second install without force -> skipped
    const retryResults = installSkills({
      scope: "local",
      targets: ["generic"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
      force: false,
    });
    expect(retryResults.every((r) => r.status === "skipped")).toBe(true);

    // Attempt install with force -> updated/created
    const forceResults = installSkills({
      scope: "local",
      targets: ["generic"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
      force: true,
    });
    expect(forceResults.every((r) => r.status === "created")).toBe(true);
  });

  it("should uninstall skill symlinks", () => {
    installSkills({
      scope: "local",
      targets: ["generic", "claude"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
    });

    const removeResults = uninstallSkills({
      scope: "local",
      targets: ["generic", "claude"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
    });

    expect(removeResults.every((r) => r.status === "removed")).toBe(true);
    expect(fs.existsSync(path.join(TEST_DIR, ".agents", "skills", "skill-a"))).toBe(false);
  });

  it("should install skills from a custom source directory override", () => {
    const customSource = path.join(TEST_DIR, "custom-source");
    fs.mkdirSync(path.join(customSource, "custom-skill"), { recursive: true });
    fs.writeFileSync(path.join(customSource, "custom-skill", "SKILL.md"), "# Custom Skill");

    const results = installSkills({
      scope: "local",
      targets: ["generic"],
      sourcePath: customSource,
      cwd: TEST_DIR,
    });

    expect(results.length).toBe(1);
    expect(results[0].skillName).toBe("custom-skill");
    expect(fs.existsSync(path.join(TEST_DIR, ".agents", "skills", "custom-skill"))).toBe(true);
  });
});
