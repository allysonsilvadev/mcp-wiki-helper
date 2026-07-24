import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { WikiChangesService } from "../services/wiki-changes.service.js";
import { registerGetSyncStatusTool } from "../tools/get-sync-status.tool.js";
import { registerListRecentChangesTool } from "../tools/list-recent-changes.tool.js";

const execFileAsync = promisify(execFile);

async function runGit(repositoryPath: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
  });
}

async function createServiceWithChanges(): Promise<{
  repositoryPath: string;
  service: WikiChangesService;
}> {
  const repositoryPath = await mkdtemp(
    path.join(os.tmpdir(), "mcp-wiki-tools-")
  );

  await runGit(repositoryPath, ["init", "-b", "main"]);
  await runGit(repositoryPath, ["config", "user.name", "MCP Test"]);
  await runGit(repositoryPath, [
    "config",
    "user.email",
    "mcp-test@example.invalid",
  ]);
  await writeFile(path.join(repositoryPath, "base.md"), "Base.\n", "utf8");
  await runGit(repositoryPath, ["add", "--all"]);
  await runGit(repositoryPath, ["commit", "-m", "initial"]);

  const service = new WikiChangesService(repositoryPath, "main");
  const previousCommit = await service.getCurrentCommit();

  await writeFile(path.join(repositoryPath, "alpha.md"), "Alpha.\n", "utf8");
  await writeFile(path.join(repositoryPath, "beta.md"), "Beta.\n", "utf8");
  await writeFile(path.join(repositoryPath, "base.md"), "Modificado.\n", "utf8");
  await runGit(repositoryPath, ["add", "--all"]);
  await runGit(repositoryPath, ["commit", "-m", "changes"]);
  await service.recordSuccessfulSynchronization(previousCommit);

  return { repositoryPath, service };
}

async function callTool(
  service: WikiChangesService,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const server = new McpServer({
    name: "wiki-changes-test",
    version: "1.0.0",
  });
  registerGetSyncStatusTool(server, service);
  registerListRecentChangesTool(server, service);

  const client = new Client({
    name: "wiki-changes-test-client",
    version: "1.0.0",
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  try {
    const result = await client.callTool({
      name,
      arguments: args,
    });
    const content = result.content as Array<{
      type: string;
      text?: string;
    }>;
    const firstContent = content[0];

    assert.equal(firstContent?.type, "text");

    if (
      !firstContent ||
      firstContent.type !== "text" ||
      typeof firstContent.text !== "string"
    ) {
      throw new Error("Resposta textual esperada.");
    }

    return JSON.parse(firstContent.text);
  } finally {
    await client.close();
    await server.close();
  }
}

test("get_sync_status retorna o estado após sucesso e erro", async (context) => {
  const { repositoryPath, service } = await createServiceWithChanges();
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  const successStatus = await callTool(service, "get_sync_status", {});

  assert.deepEqual(
    {
      status: (successStatus as { status: string }).status,
      added: (successStatus as { added: number }).added,
      modified: (successStatus as { modified: number }).modified,
      deleted: (successStatus as { deleted: number }).deleted,
      error: (successStatus as { error: string | null }).error,
    },
    {
      status: "success",
      added: 2,
      modified: 1,
      deleted: 0,
      error: null,
    }
  );

  service.recordSynchronizationError();
  const errorStatus = await callTool(service, "get_sync_status", {});

  assert.equal((errorStatus as { status: string }).status, "error");
  assert.equal(
    (errorStatus as { error: string }).error,
    "Falha ao sincronizar a Wiki."
  );
});

test("list_recent_changes aplica filtro e limit", async (context) => {
  const { repositoryPath, service } = await createServiceWithChanges();
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  assert.deepEqual(
    await callTool(service, "list_recent_changes", {
      status: "added",
    }),
    [
      { document: "alpha.md", status: "added" },
      { document: "beta.md", status: "added" },
    ]
  );

  assert.deepEqual(
    await callTool(service, "list_recent_changes", { limit: 1 }),
    [{ document: "alpha.md", status: "added" }]
  );
});

test("list_recent_changes retorna lista vazia sem erro", async (context) => {
  const repositoryPath = await mkdtemp(
    path.join(os.tmpdir(), "mcp-wiki-empty-tool-")
  );
  context.after(() => rm(repositoryPath, { recursive: true, force: true }));

  const service = new WikiChangesService(repositoryPath, "main");

  assert.deepEqual(
    await callTool(service, "list_recent_changes", {}),
    []
  );
});
