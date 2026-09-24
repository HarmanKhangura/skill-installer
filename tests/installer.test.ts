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

  it("should copy skills when scope is local", () => {
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

    // Local scope copies directory, so it should be a directory and NOT a symbolic link
    expect(fs.lstatSync(agentSkillA).isDirectory()).toBe(true);
    expect(fs.lstatSync(agentSkillA).isSymbolicLink()).toBe(false);
    expect(fs.lstatSync(claudeSkillB).isDirectory()).toBe(true);
    expect(fs.lstatSync(claudeSkillB).isSymbolicLink()).toBe(false);
  });

  it("should symlink skills when scope is global", () => {
    const results = installSkills({
      scope: "global",
      targets: ["generic"],
      sourcePath: SOURCE_SKILLS_DIR,
      cwd: TEST_DIR,
      force: true,
    });

    expect(results.every((r) => r.status === "created")).toBe(true);
    for (const r of results) {
      expect(fs.existsSync(r.linkPath)).toBe(true);
      expect(fs.lstatSync(r.linkPath).isSymbolicLink()).toBe(true);
      // Clean up test symlink from home directory
      fs.rmSync(r.linkPath, { force: true, recursive: true });
    }
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

  it("should only return parent folders of SKILL.md / SKILLS.md files and ignore non-skill folders", () => {
    const rootDir = path.join(TEST_DIR, "nested-skills-test");
    // Valid skill with SKILLS.md (plural)
    fs.mkdirSync(path.join(rootDir, "category-a", "plural-skill"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "category-a", "plural-skill", "SKILLS.md"), "# Plural Skill");

    // Valid skill with SKILL.md (singular)
    fs.mkdirSync(path.join(rootDir, "category-b", "singular-skill"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "category-b", "singular-skill", "SKILL.md"), "# Singular Skill");

    // Regular folder WITHOUT any skill markdown file
    fs.mkdirSync(path.join(rootDir, "regular-folder"), { recursive: true });
    fs.writeFileSync(path.join(rootDir, "regular-folder", "README.md"), "# Not a skill");

    const skills = findSkills(rootDir);
    expect(skills.length).toBe(2);
    expect(skills.map((s) => s.name).sort()).toEqual(["plural-skill", "singular-skill"]);
  });
});
