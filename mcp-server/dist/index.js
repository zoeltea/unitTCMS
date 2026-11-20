#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { UnitTCMSClient } from './client.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';
export function createServer(client) {
    const tcmsClient = client || new UnitTCMSClient();
    const server = new McpServer({
        name: 'unittcms-mcp',
        version: '1.0.0',
    });
    registerTools(server, tcmsClient);
    registerResources(server, tcmsClient);
    registerPrompts(server, tcmsClient);
    return { server, client: tcmsClient };
}
async function main() {
    const { server } = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('UnitTCMS MCP Server running on stdio');
}
// Run main if this file is the entrypoint
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
    main().catch((err) => {
        console.error('Fatal error in UnitTCMS MCP server:', err);
        process.exit(1);
    });
}
