import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCheckTool(server: McpServer): void {
  server.registerTool(
    "Server",
    {
      title: "Server check",
      description: "Verifica se o servidor MCP está funcionando.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "Servidor MCP funcionando!",
        },
      ],
    }),
  );
}