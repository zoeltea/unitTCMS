import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/index.js';
import { UnitTCMSClient } from '../src/client.js';

describe('MCP Protocol Integration (Client <-> Server over JSON-RPC)', () => {
  let client: Client;
  let serverInstance: any;
  let createdProjectId: number;
  let createdFolderId: number;
  let createdCaseId: number;
  let createdRunId: number;

  beforeAll(async () => {
    const tcmsClient = new UnitTCMSClient({
      baseUrl: 'http://localhost:8001',
      email: 'admin@example.com',
      password: 'password',
    });

    const { server } = createServer(tcmsClient);
    serverInstance = server;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client(
      { name: 'test-mcp-client', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
    await serverInstance.close();
  });

  it('1. should list all 16 registered tools via MCP Protocol', async () => {
    const toolsResult = await client.listTools();
    expect(toolsResult).toBeDefined();
    expect(toolsResult.tools.length).toBeGreaterThanOrEqual(14);

    const toolNames = toolsResult.tools.map((t) => t.name);
    expect(toolNames).toContain('unittcms_list_projects');
    expect(toolNames).toContain('unittcms_get_project');
    expect(toolNames).toContain('unittcms_create_project');
    expect(toolNames).toContain('unittcms_list_folders');
    expect(toolNames).toContain('unittcms_create_folder');
    expect(toolNames).toContain('unittcms_list_cases');
    expect(toolNames).toContain('unittcms_get_case');
    expect(toolNames).toContain('unittcms_create_case');
    expect(toolNames).toContain('unittcms_bulk_create_cases');
    expect(toolNames).toContain('unittcms_update_case');
    expect(toolNames).toContain('unittcms_delete_cases');
    expect(toolNames).toContain('unittcms_list_runs');
    expect(toolNames).toContain('unittcms_get_run');
    expect(toolNames).toContain('unittcms_create_run');
    expect(toolNames).toContain('unittcms_update_run_case_result');
    expect(toolNames).toContain('unittcms_add_comment');
  });

  it('2. should call unittcms_list_projects tool', async () => {
    const result = (await client.callTool({
      name: 'unittcms_list_projects',
      arguments: {},
    })) as any;

    expect(result.isError).toBeFalsy();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');

    const projects = JSON.parse(result.content[0].text);
    expect(Array.isArray(projects)).toBe(true);
  });

  it('3. should call unittcms_create_project tool', async () => {
    const result = (await client.callTool({
      name: 'unittcms_create_project',
      arguments: {
        name: `MCP Protocol Project ${Date.now()}`,
        detail: 'Created via MCP Tool invocation',
        isPublic: true,
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('created successfully');

    // Extract ID from JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    const parsed = JSON.parse(jsonMatch[0]);
    createdProjectId = parsed.id;
    expect(createdProjectId).toBeGreaterThan(0);
  });

  it('4. should call unittcms_create_folder tool', async () => {
    const result = (await client.callTool({
      name: 'unittcms_create_folder',
      arguments: {
        projectId: createdProjectId,
        name: 'MCP E2E Suite',
        detail: 'Folder created via MCP tool',
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('created successfully');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    createdFolderId = parsed.id;
    expect(createdFolderId).toBeGreaterThan(0);
  });

  it('5. should call unittcms_create_case tool', async () => {
    const result = (await client.callTool({
      name: 'unittcms_create_case',
      arguments: {
        folderId: createdFolderId,
        title: 'User can submit reset password request',
        description: 'Verify password recovery email is dispatched',
        priority: 'high',
        type: 'functional',
        preConditions: 'Registered account with verified email',
        expectedResults: 'Reset token generated and email dispatched',
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('created in folder');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    createdCaseId = parsed.id;
    expect(createdCaseId).toBeGreaterThan(0);
  });

  it('6. should call unittcms_bulk_create_cases tool', async () => {
    const result = (await client.callTool({
      name: 'unittcms_bulk_create_cases',
      arguments: {
        folderId: createdFolderId,
        cases: [
          {
            title: 'SQL injection attack prevention on login input',
            priority: 'critical',
            type: 'security',
            expectedResults: 'Parameterized query blocks malicious input',
          },
          {
            title: 'Session timeout after 24h inactivity',
            priority: 'medium',
            type: 'functional',
            expectedResults: 'User redirected to login with session expired toast',
          },
        ],
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Successfully created 2 test cases');
  });

  it('7. should call unittcms_create_run tool and include test case', async () => {
    const result = (await client.callTool({
      name: 'unittcms_create_run',
      arguments: {
        projectId: createdProjectId,
        name: 'Sprint Cycle via MCP',
        description: 'Execution run generated by AI Agent',
        caseIds: [createdCaseId],
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('created with 1 cases included');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);
    createdRunId = parsed.id;
    expect(createdRunId).toBeGreaterThan(0);
  });

  it('8. should call unittcms_update_run_case_result tool to record Passed status', async () => {
    const result = (await client.callTool({
      name: 'unittcms_update_run_case_result',
      arguments: {
        runId: createdRunId,
        caseId: createdCaseId,
        status: 'passed',
        comment: 'All assertions passed in 142ms',
      },
    })) as any;

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('status updated to 1 (passed)');
  });

  it('9. should list and read MCP resources', async () => {
    const resources = await client.listResources();
    expect(resources.resources.length).toBeGreaterThanOrEqual(1);

    const projectResource = (await client.readResource({
      uri: 'unittcms://projects',
    })) as any;

    expect(projectResource.contents).toBeDefined();
    expect(projectResource.contents[0].mimeType).toBe('application/json');
    const parsedProjects = JSON.parse(projectResource.contents[0].text);
    expect(Array.isArray(parsedProjects)).toBe(true);
  });

  it('10. should list and get MCP prompts', async () => {
    const prompts = await client.listPrompts();
    expect(prompts.prompts.length).toBeGreaterThanOrEqual(2);

    const promptNames = prompts.prompts.map((p) => p.name);
    expect(promptNames).toContain('generate_test_cases');
    expect(promptNames).toContain('analyze_test_run');

    const promptResult = await client.getPrompt({
      name: 'generate_test_cases',
      arguments: {
        featureName: 'Two-Factor Authentication (2FA)',
        specification: 'User enters TOTP code from authenticator app',
      },
    });

    expect(promptResult.messages).toBeDefined();
    expect(promptResult.messages[0].content.text).toContain('Two-Factor Authentication');
  });
});
