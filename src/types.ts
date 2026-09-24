export type Scope = "global" | "local";

export type TargetAgent = "generic" | "claude";

export interface SkillItem {
  name: string;
  path: string;
  hasSkillMd: boolean;
}

export interface InstallOptions {
  scope?: Scope;
  targets?: TargetAgent[];
  sourcePath?: string;
  skills?: string[]; // skill names to install; if empty, installs all found
  force?: boolean;
  unlink?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  cwd?: string;
}

export type InstallStatus = "created" | "updated" | "skipped" | "removed" | "failed";

export interface InstallResult {
  skillName: string;
  target: TargetAgent;
  targetDir: string;
  linkPath: string;
  status: InstallStatus;
  message?: string;
}
