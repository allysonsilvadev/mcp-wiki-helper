import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server/server.js";
import {
  gitSyncService,
  wikiIndexService,
} from "./services/services.js";

async function main(): Promise<void> {
  await gitSyncService.synchronize();
  await wikiIndexService.rebuild();

  console.error(
  `[MCP] Índice carregado com ${wikiIndexService.size()} documentos.`
);

  const synchronizationInterval =
    gitSyncService.startPeriodicSynchronization(
      async () => {
        await wikiIndexService.rebuild();
      }
    );

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