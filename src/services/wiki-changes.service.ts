import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WikiChangeStatus = "added" | "modified" | "deleted";

export interface WikiChange {
  document: string;
  status: WikiChangeStatus;
}

export interface WikiSyncStatus {
  lastSyncAt: string | null;
  status: "idle" | "success" | "error";
  branch: string;
  commit: string | null;
  added: number;
  modified: number;
  deleted: number;
  error: string | null;
}

export class WikiChangesService {
  private readonly localPath: string;
  private readonly branch: string;

  private changes: WikiChange[] = [];
  private syncStatus: WikiSyncStatus;

  public constructor(localPath: string, branch: string) {
    this.localPath = path.resolve(localPath);
    this.branch = branch;
    this.syncStatus = {
      lastSyncAt: null,
      status: "idle",
      branch,
      commit: null,
      added: 0,
      modified: 0,
      deleted: 0,
      error: null,
    };
  }

  public getStatus(): WikiSyncStatus {
    return { ...this.syncStatus };
  }

  public listRecentChanges(
    status?: WikiChangeStatus,
    limit = 50
  ): WikiChange[] {
    return this.changes
      .filter((change) => !status || change.status === status)
      .sort((first, second) =>
        first.document.localeCompare(second.document, "pt-BR")
      )
      .slice(0, limit)
      .map((change) => ({ ...change }));
  }

  public async getCurrentCommit(): Promise<string | null> {
    try {
      await access(path.join(this.localPath, ".git"));
    } catch {
      return null;
    }

    const { stdout } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD"],
      { cwd: this.localPath, encoding: "utf8" }
    );

    return stdout.trim() || null;
  }

  public async recordSuccessfulSynchronization(
    previousCommit: string | null
  ): Promise<void> {
    const currentCommit = await this.getCurrentCommit();
    let nextChanges: WikiChange[] = [];

    if (
      previousCommit &&
      currentCommit &&
      previousCommit !== currentCommit
    ) {
      nextChanges = await this.detectChanges(
        previousCommit,
        currentCommit
      );
    }

    this.changes = nextChanges;
    this.syncStatus = {
      lastSyncAt: new Date().toISOString(),
      status: "success",
      branch: this.branch,
      commit: currentCommit,
      added: nextChanges.filter((change) => change.status === "added").length,
      modified: nextChanges.filter((change) => change.status === "modified")
        .length,
      deleted: nextChanges.filter((change) => change.status === "deleted")
        .length,
      error: null,
    };
  }

  public recordSynchronizationError(): void {
    this.syncStatus = {
      ...this.syncStatus,
      lastSyncAt: new Date().toISOString(),
      status: "error",
      error: "Falha ao sincronizar a Wiki.",
    };
  }

  private async detectChanges(
    previousCommit: string,
    currentCommit: string
  ): Promise<WikiChange[]> {
    const { stdout } = await execFileAsync(
      "git",
      [
        "diff",
        "--name-status",
        "--find-renames",
        "-z",
        previousCommit,
        currentCommit,
        "--",
        "*.md",
      ],
      { cwd: this.localPath, encoding: "utf8" }
    );

    const fields = stdout.split("\0");
    const changes: WikiChange[] = [];

    for (let index = 0; index < fields.length; ) {
      const gitStatus = fields[index++];

      if (!gitStatus) {
        continue;
      }

      if (gitStatus.startsWith("R")) {
        const oldPath = fields[index++];
        const newPath = fields[index++];

        if (oldPath?.endsWith(".md")) {
          changes.push({ document: oldPath, status: "deleted" });
        }

        if (newPath?.endsWith(".md")) {
          changes.push({ document: newPath, status: "added" });
        }

        continue;
      }

      const document = fields[index++];

      if (!document?.endsWith(".md")) {
        continue;
      }

      const statusMap: Partial<Record<string, WikiChangeStatus>> = {
        A: "added",
        M: "modified",
        D: "deleted",
      };
      const mappedStatus = statusMap[gitStatus[0] ?? ""];

      if (mappedStatus) {
        changes.push({ document, status: mappedStatus });
      }
    }

    return changes;
  }
}
