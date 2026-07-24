import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { wikiChangesService } from "../services/services.js";
import type { WikiChangesService,WikiChangeStatus } from "../services/wiki-changes.service.js";

export function registerListRecentChangesTool(
  server: McpServer,
  changesService: WikiChangesService = wikiChangesService
): void {
  server.registerTool(
    "list_recent_changes",
    {
      title: "List Recent Wiki Changes",
      description:
        "Lista os documentos Markdown adicionados, modificados ou removidos na última sincronização da Wiki.",
      inputSchema: {
        status: z
          .enum(["added", "modified", "deleted"])
          .optional()
          .describe("Filtra as mudanças pelo tipo de alteração."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Quantidade máxima de mudanças retornadas."),
      },
    },
    async ({ status, limit }) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            changesService.listRecentChanges(
              status as WikiChangeStatus | undefined,
              limit
            ),
            null,
            2
          ),
        },
      ],
    })
  );
}
