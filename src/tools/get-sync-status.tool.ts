import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wikiChangesService } from "../services/services.js";
import type { WikiChangesService } from "../services/wiki-changes.service.js";

export function registerGetSyncStatusTool(
  server: McpServer,
  changesService: WikiChangesService = wikiChangesService
): void {
  server.registerTool(
    "get_sync_status",
    {
      title: "Get Wiki Sync Status",
      description:
        "Informa a situação da última sincronização da cópia local da Wiki, incluindo branch, commit e totais de mudanças.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(changesService.getStatus(), null, 2),
        },
      ],
    })
  );
}
