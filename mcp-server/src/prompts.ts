import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UnitTCMSClient } from './client.js';

export function registerPrompts(server: McpServer, _client: UnitTCMSClient) {
  server.prompt(
    'generate_test_cases',
    'Generate comprehensive test cases from a user story, feature specification, or PRD',
    {
      featureName: z.string().describe('Name of the feature to test'),
      specification: z.string().describe('Requirements, user stories, or acceptance criteria'),
      folderId: z.string().optional().describe('Target folder ID if saving directly to UnitTCMS'),
    },
    async ({ featureName, specification, folderId }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please design a comprehensive test suite for the feature "${featureName}".

Specification:
${specification}

Requirements:
1. Cover positive (happy path), negative, edge cases, and security/boundary conditions.
2. For each test case, include:
   - title: Clear, concise summary
   - description: Testing objective
   - priority: "critical", "high", "medium", or "low"
   - type: "functional", "security", "smoke", "regression", etc.
   - preConditions: Prerequisites required before execution
   - expectedResults: Exact expected behavior
3. Format the result so it can be directly passed into the "unittcms_bulk_create_cases" MCP tool ${
                folderId ? `for folderId: ${folderId}` : ''
              }.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'analyze_test_run',
    'Analyze test execution results of a test run and provide failure root-cause analysis',
    {
      runId: z.string().describe('The ID of the test run to analyze'),
    },
    async ({ runId }) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please inspect UnitTCMS Test Run #${runId} using the "unittcms_get_run" tool.
Analyze:
1. Overall pass rate and test execution progress.
2. Which specific test cases failed or were blocked.
3. Common patterns or root causes in the failure comments/logs.
4. Recommendations for release readiness and high-priority fixes.`,
            },
          },
        ],
      };
    }
  );
}
