import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { WikiService } from "../services/wiki.service.js";

export function registerSearchDocumentsTool(server: McpServer): void {
  const wikiService = new WikiService();

  server.registerTool(
    "search_documents",
    {
      title: "Search Documents",
      description: "Busca documentos da Wiki pelo nome ou caminho.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Texto para pesquisar."),
      },
    },
    async ({ query }) => {
      const documents = await wikiService.searchDocuments(query);

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