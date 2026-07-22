import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer, type ServerResponse } from "node:http";

import { createServer } from "./server/server.js";
import { gitSyncService, wikiIndexService } from "./services/services.js";

const host = process.env.MCP_HTTP_HOST ?? "0.0.0.0";
const port = Number(process.env.MCP_HTTP_PORT ?? "3000");
const route = process.env.MCP_HTTP_ROUTE ?? "/mcp";
const apiKey = process.env.MCP_API_KEY;

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`MCP_HTTP_PORT invalida: ${process.env.MCP_HTTP_PORT}`);
}

if (!route.startsWith("/")) {
  throw new Error("MCP_HTTP_ROUTE deve comecar com /");
}

async function main(): Promise<void> {
  await gitSyncService.synchronize();
  await wikiIndexService.rebuild();

  console.error(
    `[MCP] Indice carregado com ${wikiIndexService.size()} documentos.`
  );

  const synchronizationInterval = gitSyncService.startPeriodicSynchronization(
    async () => {
      await wikiIndexService.rebuild();
    }
  );

  const sendJson = (
    res: ServerResponse,
    statusCode: number,
    body: unknown
  ): void => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const httpServer = createHttpServer(async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, { status: "ok", documents: wikiIndexService.size() });
      return;
    }

    if (pathname !== route) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed" },
        id: null,
      });
      return;
    }

    if (apiKey && req.headers.authorization !== `Bearer ${apiKey}`) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error: unknown) {
      console.error("[MCP] Erro ao processar requisicao HTTP:", error);

      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  httpServer.listen(port, host, () => {
    console.error(`[MCP] HTTP ativo em http://${host}:${port}${route}`);
  });

  const stopServer = (): void => {
    console.error("[MCP] Encerrando o servidor HTTP...");
    clearInterval(synchronizationInterval);
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);
}

main().catch((error: unknown) => {
  console.error("[MCP] Erro ao iniciar o servidor HTTP:", error);
  process.exitCode = 1;
});
