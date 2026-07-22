import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCheckTool } from "../tools/check.tools.js";
import { registerListDocumentsTool } from "../tools/list-documents.tool.js";
import { registerReadDocumentTool } from "../tools/read-document.tool.js";
import { registerSearchDocumentsTool } from "../tools/search-documents.tool.js";
import { registerSearchContentTool } from "../tools/search-content.tool.js";

export function createServer(): McpServer {
    const server = new McpServer({
        name: "mcp-wiki-helper",
        version: "1.0.0",
    });

    registerCheckTool(server);
    registerListDocumentsTool(server);
    registerReadDocumentTool(server);
    registerSearchDocumentsTool(server);
    registerSearchContentTool(server);

    return server;
}
