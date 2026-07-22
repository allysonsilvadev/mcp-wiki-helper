import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHelloTool } from "../tools/hello.tools.js";
import { registerListDocumentsTool } from "../tools/list-documents.tool.js";
import { Server } from "node:http";
import { registerReadDocumentTool } from "../tools/read-document.tool.js";
import { registerSearchDocumentsTool } from "../tools/search-documents.tool.js";

export function createServer(): McpServer {
    const server = new McpServer({
        name: "mcp-wiki-helper",
        version: "1.0.0",
    });

    registerHelloTool(server);
    registerListDocumentsTool(server);
    registerReadDocumentTool(server);
    registerSearchDocumentsTool(server);

    return server;
}

