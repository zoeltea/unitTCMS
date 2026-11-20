import { describe, it, expect, beforeAll } from 'vitest';
import { UnitTCMSClient } from '../src/client.js';
import { createServer } from '../src/index.js';

describe('UnitTCMS MCP Server & Client End-to-End Verification', () => {
  let client: UnitTCMSClient;
  let testProjectId: number;
  let testFolderId: number;
  let testCaseId: number;
  let bulkCaseIds: number[] = [];
  let testRunId: number;

  beforeAll(async () => {
    client = new UnitTCMSClient({
      baseUrl: 'http://localhost:8001',
      email: 'admin@example.com',
      password: 'password',
    });
  });

  it('1. should authenticate successfully and acquire JWT token', async () => {
    const token = await client.ensureToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('2. should list existing projects and find seed data', async () => {
    const projects = await client.listProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it('3. should create a new test project for MCP verification', async () => {
    const timestamp = Date.now();
    const newProject = await client.createProject(
      `MCP Auto Test Project ${timestamp}`,
      'Automated integration testing for MCP tools',
      true
    );
    expect(newProject).toBeDefined();
    expect(newProject.id).toBeDefined();
    expect(newProject.name).toContain('MCP Auto Test Project');
    testProjectId = newProject.id;
  });

  it('4. should get the created project by ID', async () => {
    const project = await client.getProject(testProjectId);
    expect(project).toBeDefined();
    expect(project.id).toBe(testProjectId);
  });

  it('5. should create a folder in the project', async () => {
    const folder = await client.createFolder(
      testProjectId,
      'MCP Auth Suite',
      'Test cases for authentication workflows'
    );
    expect(folder).toBeDefined();
    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('MCP Auth Suite');
    expect(folder.projectId).toBe(testProjectId.toString());
    testFolderId = folder.id;
  });

  it('6. should list folders in the project', async () => {
    const folders = await client.listFolders(testProjectId);
    expect(Array.isArray(folders)).toBe(true);
    expect(folders.some((f) => f.id === testFolderId)).toBe(true);
  });

  it('7. should create a single test case with preconditions and expected results', async () => {
    const newCase = await client.createCase(testFolderId, {
      title: 'Verify valid login credentials',
      description: 'Ensure user can sign in with correct email and password',
      priority: 0, // Critical
      type: 4, // Functional
      preConditions: 'User account exists and is active in database',
      expectedResults: 'User is authenticated and receives JWT token',
      automationStatus: 1,
    });
    expect(newCase).toBeDefined();
    expect(newCase.id).toBeDefined();
    expect(newCase.title).toBe('Verify valid login credentials');
    expect(newCase.folderId).toBe(testFolderId.toString());
    testCaseId = newCase.id;
  });

  it('8. should get full details of the created test case', async () => {
    const caseDetail = await client.getCase(testCaseId);
    expect(caseDetail).toBeDefined();
    expect(caseDetail.id).toBe(testCaseId);
    expect(caseDetail.title).toBe('Verify valid login credentials');
    expect(caseDetail.preConditions).toBe('User account exists and is active in database');
    expect(caseDetail.expectedResults).toBe('User is authenticated and receives JWT token');
  });

  it('9. should update test case details', async () => {
    const updated = await client.updateCase(testCaseId, {
      title: 'Verify valid login credentials (UPDATED by MCP)',
      priority: 1, // High
    });
    expect(updated).toBeDefined();

    const verified = await client.getCase(testCaseId);
    expect(verified.title).toBe('Verify valid login credentials (UPDATED by MCP)');
    expect(verified.priority).toBe(1);
  });

  it('10. should create multiple test cases in batch (bulk create)', async () => {
    const casesToCreate = [
      {
        title: 'Verify login with incorrect password',
        description: 'Check 401 error returned on wrong password',
        priority: 1,
        type: 4,
        preConditions: 'User exists',
        expectedResults: 'HTTP 401 Unauthorized',
      },
      {
        title: 'Verify rate limiting on brute force login',
        description: 'Check 429 status on >1000 requests',
        priority: 0,
        type: 1, // Security
        preConditions: 'Rate limiter enabled',
        expectedResults: 'Rate limit blocked error',
      },
    ];

    for (const item of casesToCreate) {
      const created = await client.createCase(testFolderId, item);
      bulkCaseIds.push(created.id);
    }

    expect(bulkCaseIds.length).toBe(2);

    const folderCases = await client.listCases(testFolderId);
    expect(folderCases.length).toBeGreaterThanOrEqual(3);
  });

  it('11. should create a test run containing test cases', async () => {
    const allCaseIds = [testCaseId, ...bulkCaseIds];
    const run = await client.createRun(
      testProjectId,
      'MCP Execution Cycle 1.0',
      'Automated run created by MCP Agent',
      allCaseIds
    );
    expect(run).toBeDefined();
    expect(run.id).toBeDefined();
    expect(run.name).toBe('MCP Execution Cycle 1.0');
    testRunId = run.id;
  });

  it('12. should list test runs in the project', async () => {
    const runs = await client.listRuns(testProjectId);
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.some((r) => r.id === testRunId)).toBe(true);
  });

  it('13. should get test run details and list its run cases', async () => {
    const runData = await client.getRun(testRunId);
    expect(runData.run).toBeDefined();
    expect(runData.run.id).toBe(testRunId);

    const runCases = await client.listRunCases(testRunId);
    expect(Array.isArray(runCases)).toBe(true);
    expect(runCases.length).toBeGreaterThanOrEqual(3);
  });

  it('14. should update run case result to Passed and Failed with comments', async () => {
    const runCases = await client.listRunCases(testRunId);
    const targetCase1 = runCases[0];
    const targetCase2 = runCases[1];

    // Mark case 1 as Passed (1)
    await client.updateRunCases(testRunId, [
      {
        id: targetCase1.id,
        caseId: targetCase1.caseId,
        status: 1, // Passed
      },
    ]);

    // Mark case 2 as Failed (2) and add error comment
    await client.updateRunCases(testRunId, [
      {
        id: targetCase2.id,
        caseId: targetCase2.caseId,
        status: 2, // Failed
      },
    ]);

    const comment = await client.addComment(
      'RunCase',
      targetCase2.id,
      'AssertionError: Expected HTTP 401 but received HTTP 500 in Playwright runner'
    );
    expect(comment).toBeDefined();
    expect(comment.content).toContain('AssertionError');

    // Verify updated statuses
    const updatedRunCases = await client.listRunCases(testRunId);
    const updated1 = updatedRunCases.find((rc) => rc.id === targetCase1.id);
    const updated2 = updatedRunCases.find((rc) => rc.id === targetCase2.id);

    expect(updated1?.status).toBe(1); // Passed
    expect(updated2?.status).toBe(2); // Failed
  });

  it('15. should verify McpServer instance initializes properly with all tools & resources', () => {
    const { server } = createServer(client);
    expect(server).toBeDefined();
    // Server contains registered tools and capabilities
    expect((server as any)._registeredTools).toBeDefined();
  });

  it('16. should delete test cases using bulk delete', async () => {
    await client.bulkDeleteCases(testProjectId, bulkCaseIds);
    const remainingCases = await client.listCases(testFolderId);
    expect(remainingCases.some((c) => bulkCaseIds.includes(c.id))).toBe(false);
  });
});
