import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server/server.js";
import { GitSyncService } from "./services/git-sync.service.js";

async function main(): Promise<void> {
  const gitSyncService = new GitSyncService();

  // Atualiza a Wiki antes de iniciar o MCP.
  await gitSyncService.synchronize();

  // Continua atualizando a cada 30 minutos.
  const synchronizationInterval =
    gitSyncService.startPeriodicSynchronization();

  const server = createServer();
  const transport = new StdioServerTransport();

  const stopServer = (): void => {
    console.error("[MCP] Encerrando o servidor...");

    clearInterval(synchronizationInterval);
    process.exit(0);
  };

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  await server.connect(transport);

  console.error("[MCP] Servidor iniciado com sucesso.");
}

main().catch((error: unknown) => {
  console.error("[MCP] Erro ao iniciar o servidor:", error);
  process.exitCode = 1;
});