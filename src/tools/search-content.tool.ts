import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { wikiIndexService } from "../services/services.js";

export function registerSearchContentTool(
  server: McpServer
): void {
  server.registerTool(
    "search_content",
    {
      title: "Search Wiki Content",
      description:
        "Pesquisa termos dentro do conteúdo dos documentos Markdown da Wiki.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Termos que devem ser pesquisados na Wiki."),

        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Quantidade máxima de documentos retornados."),
      },
    },
    async ({ query, limit }) => {
      try {
        const results = wikiIndexService.searchContent(
          query,
          limit
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao pesquisar o conteúdo da Wiki.";

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: message,
            },
          ],
        };
      }
    }
  );
}