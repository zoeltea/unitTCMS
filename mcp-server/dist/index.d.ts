#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { UnitTCMSClient } from './client.js';
export declare function createServer(client?: UnitTCMSClient): {
    server: McpServer;
    client: UnitTCMSClient;
};
