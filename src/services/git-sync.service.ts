import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { env } from "../config/env.js";

const execFileAsync = promisify(execFile);

export class GitSyncService {
  private readonly repositoryUrl: string;
  private readonly localPath: string;
  private readonly branch: string;

  private isSynchronizing = false;

  constructor() {
    this.repositoryUrl = env.wiki.repositoryUrl;
    this.localPath = path.resolve(env.wiki.localPath);
    this.branch = env.wiki.branch;
  }

  public getLocalPath(): string {
    return this.localPath;
  }

  public async ensureRepositoryAvailable(): Promise<void> {
    const repositoryExists = await this.repositoryExists();

    if (!repositoryExists) {
      await this.cloneRepository();
      return;
    }

    await this.updateRepository();
  }

  public async synchronize(): Promise<void> {
    if (this.isSynchronizing) {
      console.error("[GitSyncService] Sincronização já está em andamento.");
      return;
    }

    this.isSynchronizing = true;

    try {
      await this.ensureRepositoryAvailable();
    } catch (error) {
      console.error(
        "[GitSyncService] Não foi possível sincronizar a Wiki:",
        error
      );

      throw error;
    } finally {
      this.isSynchronizing = false;
    }
  }

  public startPeriodicSynchronization(
    onSynchronized?: () => Promise<void>
  ): NodeJS.Timeout {
    console.error(
      `[GitSyncService] Sincronização periódica configurada para ${env.wiki.syncIntervalMs} ms.`
    );

    return setInterval(() => {
      void this.synchronize()
        .then(async () => {
          await onSynchronized?.();
        })
        .catch((error: unknown) => {
          console.error(
            "[GitSyncService] Falha na sincronização periódica:",
            error
          );
        });
    }, env.wiki.syncIntervalMs);
  }

  private async repositoryExists(): Promise<boolean> {
    const gitDirectory = path.join(this.localPath, ".git");

    try {
      await access(gitDirectory);
      return true;
    } catch {
      return false;
    }
  }

  private async cloneRepository(): Promise<void> {
    console.error("[GitSyncService] Clonando o repositório da Wiki...");

    const parentDirectory = path.dirname(this.localPath);

    await mkdir(parentDirectory, {
      recursive: true
    });

    await execFileAsync("git", [
      "clone",
      "--branch",
      this.branch,
      "--single-branch",
      this.repositoryUrl,
      this.localPath
    ]);

    console.error("[GitSyncService] Repositório clonado com sucesso.");
  }

  private async updateRepository(): Promise<void> {
    console.error("[GitSyncService] Atualizando o repositório da Wiki...");

    await execFileAsync(
      "git",
      ["fetch", "origin", this.branch],
      {
        cwd: this.localPath
      }
    );

    await execFileAsync(
      "git",
      ["reset", "--hard", `origin/${this.branch}`],
      {
        cwd: this.localPath
      }
    );

    console.error("[GitSyncService] Repositório atualizado com sucesso.");
  }
}