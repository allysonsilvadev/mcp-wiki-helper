import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp,mkdir,rename,rm,unlink,writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { WikiChangesService } from "../services/wiki-changes.service.js";

const execFileAsync = promisify(execFile);

async function runGit(repositoryPath: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
  });
}

async function commitAll(
  repositoryPath: string,
  message: string
): Promise<void> {
  await runGit(repositoryPath, ["add", "--all"]);
  await runGit(repositoryPath, ["commit", "-m", message]);
}

async function createRepository(): Promise<string> {
  const repositoryPath = await mkdtemp(
    path.join(os.tmpdir(), "mcp-wiki-changes-")
  );

  await runGit(repositoryPath, ["init", "-b", "main"]);
  await runGit(repositoryPath, ["config", "user.name", "MCP Test"]);
  await runGit(repositoryPath, [
    "config",
    "user.email",
    "mcp-test@example.invalid",
  ]);

  await mkdir(path.join(repositoryPath, "docs"));
  await writeFile(
    path.join(repositoryPath, "docs", "existing.md"),
    "Conteúdo inicial exclusivo.\n",
    "utf8"
  );
  await writeFile(
    path.join(repositoryPath, "docs", "remove.md"),
    "Este documento será removido e possui conteúdo único.\n",
    "utf8"
  );
  await writeFile(
    path.join(repositoryPath, "docs", "old-name.md"),
    "Documento que será apenas renomeado, sem mudar seu conteúdo.\n",
    "utf8"
  );
  await commitAll(repositoryPath, "initial");

  return repositoryPath;
}

test("primeira sincronização registra sucesso sem mudanças", async (context) => {
  const repositoryPath = await createRepository();
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  const service = new WikiChangesService(repositoryPath, "main");
  await service.recordSuccessfulSynchronization(null);

  const status = service.getStatus();

  assert.equal(status.status, "success");
  assert.equal(status.branch, "main");
  assert.match(status.commit ?? "", /^[0-9a-f]{40}$/);
  assert.equal(status.added, 0);
  assert.equal(status.modified, 0);
  assert.equal(status.deleted, 0);
  assert.deepEqual(service.listRecentChanges(), []);
});

test("detecta adição, modificação, remoção e renomeação somente de Markdown", async (context) => {
  const repositoryPath = await createRepository();
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  const service = new WikiChangesService(repositoryPath, "main");
  const previousCommit = await service.getCurrentCommit();

  await writeFile(
    path.join(repositoryPath, "docs", "added.md"),
    "Documento adicionado.\n",
    "utf8"
  );
  await writeFile(
    path.join(repositoryPath, "docs", "existing.md"),
    "Conteúdo modificado.\n",
    "utf8"
  );
  await writeFile(
    path.join(repositoryPath, "docs", "ignored.txt"),
    "Não deve aparecer.\n",
    "utf8"
  );
  await unlink(path.join(repositoryPath, "docs", "remove.md"));
  await rename(
    path.join(repositoryPath, "docs", "old-name.md"),
    path.join(repositoryPath, "docs", "new-name.md")
  );
  await commitAll(repositoryPath, "wiki changes");

  await service.recordSuccessfulSynchronization(previousCommit);

  assert.deepEqual(service.listRecentChanges(), [
    { document: "docs/added.md", status: "added" },
    { document: "docs/existing.md", status: "modified" },
    { document: "docs/new-name.md", status: "added" },
    { document: "docs/old-name.md", status: "deleted" },
    { document: "docs/remove.md", status: "deleted" },
  ]);

  assert.deepEqual(service.listRecentChanges("deleted"), [
    { document: "docs/old-name.md", status: "deleted" },
    { document: "docs/remove.md", status: "deleted" },
  ]);
  assert.deepEqual(service.listRecentChanges(undefined, 2), [
    { document: "docs/added.md", status: "added" },
    { document: "docs/existing.md", status: "modified" },
  ]);

  const status = service.getStatus();
  assert.equal(status.added, 2);
  assert.equal(status.modified, 1);
  assert.equal(status.deleted, 2);
});

test("erro preserva a última lista válida e publica mensagem segura", async (context) => {
  const repositoryPath = await createRepository();
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  const service = new WikiChangesService(repositoryPath, "main");
  const previousCommit = await service.getCurrentCommit();

  await writeFile(
    path.join(repositoryPath, "docs", "added.md"),
    "Documento adicionado.\n",
    "utf8"
  );
  await commitAll(repositoryPath, "add document");
  await service.recordSuccessfulSynchronization(previousCommit);

  const validChanges = service.listRecentChanges();
  service.recordSynchronizationError();

  assert.deepEqual(service.listRecentChanges(), validChanges);
  assert.equal(service.getStatus().status, "error");
  assert.equal(
    service.getStatus().error,
    "Falha ao sincronizar a Wiki."
  );
});
