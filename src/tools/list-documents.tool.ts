import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WikiService } from "../services/wiki.service.js";

export function registerListDocumentsTool(server: McpServer): void {
  const wikiService = new WikiService();

  server.registerTool(
    "list_documents",
    {
      title: "List Documents",
      description: "Lista todos os documentos disponíveis na Wiki.",
      inputSchema: {},
    },
    async () => {
      const documents = await wikiService.listDocuments();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(documents, null, 2),
          },
        ],
      };
    }
  );
}