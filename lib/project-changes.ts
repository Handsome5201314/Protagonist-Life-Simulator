import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { OpenClawGatewayClient } from "@/lib/openclaw-gateway";
import type {
  ProjectChangeDraft,
  ProjectBuildVerification,
  ProjectChangeHistoryEntry,
  ProjectChangeProposal,
} from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

const SAFE_ROOTS = ["app", "components", "lib", "core", "scripts"];
const SAFE_FILES = new Set(["README.md", ".env.example", "requirements.engine.txt", "main.py"]);
const execFile = promisify(execFileCallback);

function normalizeRelativePath(input: string) {
  return input.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function assertSafeProjectPath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  if (SAFE_FILES.has(normalized)) return normalized;
  if (SAFE_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))) {
    return normalized;
  }
  throw new Error(`Unsafe project path: ${relativePath}`);
}

function extractJsonCandidate(text: string) {
  const cleaned = text.trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(extractJsonCandidate(text)) as T;
  } catch {
    return null;
  }
}

async function buildProjectManifest() {
  const files: string[] = [];
  for (const root of SAFE_ROOTS) {
    const rootPath = path.join(process.cwd(), root);
    try {
      const entries = await fs.readdir(rootPath, { recursive: true });
      entries
        .filter((entry) => typeof entry === "string")
        .slice(0, 400)
        .forEach((entry) => files.push(`${root}/${entry}`.replace(/\\/g, "/")));
    } catch {
      continue;
    }
  }
  SAFE_FILES.forEach((file) => files.push(file));
  return files.sort();
}

async function readExistingContents(paths: string[]) {
  const snapshots: Record<string, string | null> = {};
  for (const relative of paths) {
    const absolute = path.join(process.cwd(), relative);
    try {
      snapshots[relative] = await fs.readFile(absolute, "utf8");
    } catch {
      snapshots[relative] = null;
    }
  }
  return snapshots;
}

async function buildUnifiedDiff(relativePath: string, before: string | null, after: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tda-diff-"));
  const beforeFile = path.join(tempDir, "before.txt");
  const afterFile = path.join(tempDir, "after.txt");

  try {
    await fs.writeFile(beforeFile, before ?? "", "utf8");
    await fs.writeFile(afterFile, after, "utf8");

    try {
      const { stdout } = await execFile(
        "git",
        ["diff", "--no-index", "--unified=3", "--", beforeFile, afterFile],
        { cwd: process.cwd(), maxBuffer: 2 * 1024 * 1024 }
      );
      return stdout
        .replace(new RegExp(beforeFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `a/${relativePath}`)
        .replace(new RegExp(afterFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `b/${relativePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Command failed")) {
        const stdout = (error as { stdout?: string }).stdout || "";
        if (stdout.trim()) {
          return stdout
            .replace(new RegExp(beforeFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `a/${relativePath}`)
            .replace(new RegExp(afterFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `b/${relativePath}`);
        }
      }
      return `--- a/${relativePath}\n+++ b/${relativePath}\n@@\n-${(before ?? "").slice(0, 400)}\n+${after.slice(0, 400)}\n`;
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function runBuildVerification(): Promise<ProjectBuildVerification> {
  const command = process.platform === "win32" ? "npm.cmd run build" : "npm run build";
  try {
    const executable = process.platform === "win32" ? "npm.cmd" : "npm";
    const { stdout, stderr } = await execFile(executable, ["run", "build"], {
      cwd: process.cwd(),
      maxBuffer: 8 * 1024 * 1024,
      timeout: 1000 * 60 * 10,
    });
    return {
      command,
      exitCode: 0,
      status: "passed",
      stdout,
      stderr,
      ranAt: nowIso(),
    };
  } catch (error) {
    return {
      command,
      exitCode: typeof (error as { code?: number }).code === "number" ? (error as { code: number }).code : null,
      status: "failed",
      stdout: (error as { stdout?: string }).stdout || "",
      stderr: (error as { stderr?: string }).stderr || (error instanceof Error ? error.message : "Build failed"),
      ranAt: nowIso(),
    };
  }
}

export async function generateProjectChangeProposal(input: {
  prompt: string;
  agentId?: string;
}) {
  const agentId = input.agentId || "superadmin";
  const manifest = await buildProjectManifest();
  const client = new OpenClawGatewayClient();
  const beforeSnapshots = await readExistingContents(manifest);

  const prompt = [
    "You are generating a controlled project change proposal for Turing Destiny Arena.",
    "Output JSON only.",
    "Do not narrate your reasoning.",
    "Only propose edits inside these safe paths:",
    ...manifest.slice(0, 250),
    "",
    "Return this shape:",
    '{',
    '  "summary": "one paragraph",',
    '  "changes": [',
    '    {',
    '      "path": "relative/path.ts",',
    '      "operation": "replace",',
    '      "reason": "why this file changes",',
    '      "content": "full new file content"',
    "    }",
    "  ]",
    "}",
    "",
    `User request: ${input.prompt}`,
  ].join("\n");

  const raw = await client.generateText(prompt, {
    agentId,
    temperature: 0.25,
    maxTokens: 6000,
    systemPrompt:
      "Return JSON only. Propose file-level project edits. Never claim code is already changed. Never include unsafe paths.",
  });

  const parsed = safeJsonParse<{
    summary?: string;
    changes?: Array<{
      path?: string;
      operation?: "replace" | "create";
      reason?: string;
      content?: string;
    }>;
  }>(raw);

  if (!parsed?.changes?.length) {
    throw new Error("OpenClaw did not return a valid project change proposal");
  }

  const changes: ProjectChangeDraft[] = [];
  for (const change of parsed.changes) {
    const relativePath = assertSafeProjectPath(change.path || "");
    const content = (change.content || "").replace(/\r/g, "");
    const diff = await buildUnifiedDiff(relativePath, beforeSnapshots[relativePath] ?? null, content);
    changes.push({
      path: relativePath,
      operation: change.operation === "create" ? "create" : "replace",
      reason: (change.reason || "No reason provided").trim(),
      content,
      diff,
    });
  }

  return {
    id: createId("proposal"),
    createdAt: nowIso(),
    prompt: input.prompt,
    summary: (parsed.summary || "OpenClaw generated a project change proposal.").trim(),
    agentId,
    status: "draft" as const,
    changes,
  } satisfies ProjectChangeProposal;
}

export async function applyProjectChangeProposal(proposal: ProjectChangeProposal) {
  const beforeSnapshots = await readExistingContents(proposal.changes.map((change) => change.path));
  const files: ProjectChangeHistoryEntry["files"] = [];

  for (const change of proposal.changes) {
    const relative = assertSafeProjectPath(change.path);
    const absolute = path.join(process.cwd(), relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    const before = beforeSnapshots[relative] ?? null;
    await fs.writeFile(absolute, change.content, "utf8");
    files.push({
      path: relative,
      before,
      after: change.content,
    });
  }

  const verification = await runBuildVerification();

  return {
    id: createId("proposal_history"),
    proposalId: proposal.id,
    createdAt: nowIso(),
    action: "apply" as const,
    summary: proposal.summary,
    verification,
    files,
  } satisfies ProjectChangeHistoryEntry;
}

export async function rollbackProjectChangeHistory(entry: ProjectChangeHistoryEntry) {
  const files: ProjectChangeHistoryEntry["files"] = [];

  for (const file of entry.files) {
    const relative = assertSafeProjectPath(file.path);
    const absolute = path.join(process.cwd(), relative);
    const current = await fs.readFile(absolute, "utf8").catch(() => null);

    if (file.before === null) {
      await fs.rm(absolute, { force: true });
    } else {
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, file.before, "utf8");
    }

    files.push({
      path: relative,
      before: current,
      after: file.before,
    });
  }

  const verification = await runBuildVerification();

  return {
    id: createId("proposal_history"),
    proposalId: entry.proposalId,
    createdAt: nowIso(),
    action: "rollback" as const,
    summary: `Rollback ${entry.id}`,
    verification,
    files,
  } satisfies ProjectChangeHistoryEntry;
}
