import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WikiService } from "../services/wiki.service.js";

export function registerReadDocumentTool(server: McpServer): void {
  const wikiService = new WikiService();

  server.registerTool(
    "read_document",
    {
      title: "Read Document",
      description: "Lê o conteúdo de um documento da Wiki pelo caminho.",
      inputSchema: {
        path: z
          .string()
          .min(1)
          .describe('Caminho do documento, por exemplo: "software/JWT.md"'),
      },
    },
    async ({ path }) => {
      try {
        const document = await wikiService.readDocument(path);

        return {
          content: [
            {
              type: "text",
              text: document,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : "Erro ao ler o documento.",
            },
          ],
          isError: true,
        };
      }
    }
  );
}