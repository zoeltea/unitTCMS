import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UnitTCMSClient } from './client.js';

// Helper maps
const PRIORITY_MAP: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TYPE_MAP: Record<string, number> = {
  other: 0,
  security: 1,
  performance: 2,
  accessibility: 3,
  functional: 4,
  acceptance: 5,
  usability: 6,
  smoke: 7,
  smokesanity: 7,
  compatibility: 8,
  destructive: 9,
  regression: 10,
  automated: 11,
  manual: 12,
};

const STATUS_MAP: Record<string, number> = {
  untested: 0,
  passed: 1,
  failed: 2,
  retest: 3,
  skipped: 4,
};

export function registerTools(server: McpServer, client: UnitTCMSClient) {
  // 1. unittcms_list_projects
  server.tool(
    'unittcms_list_projects',
    'List all test projects in UnitTCMS',
    {
      onlyUserProjects: z
        .boolean()
        .optional()
        .describe('Whether to only list projects owned by the authenticated user'),
    },
    async ({ onlyUserProjects }) => {
      try {
        const projects = await client.listProjects(onlyUserProjects || false);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing projects: ${error.message}` }],
        };
      }
    }
  );

  // 2. unittcms_get_project
  server.tool(
    'unittcms_get_project',
    'Get project details including folders by project ID',
    {
      projectId: z.number().describe('The ID of the project'),
    },
    async ({ projectId }) => {
      try {
        const project = await client.getProject(projectId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting project #${projectId}: ${error.message}` }],
        };
      }
    }
  );

  // 3. unittcms_create_project
  server.tool(
    'unittcms_create_project',
    'Create a new test project in UnitTCMS',
    {
      name: z.string().describe('The name of the project'),
      detail: z.string().optional().describe('Project description or summary'),
      isPublic: z.boolean().optional().default(true).describe('Whether the project is public to team members'),
    },
    async ({ name, detail, isPublic }) => {
      try {
        const project = await client.createProject(name, detail || '', isPublic);
        return {
          content: [
            {
              type: 'text',
              text: `Project "${project.name}" (ID: ${project.id}) created successfully.\n\n` +
                JSON.stringify(project, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error creating project: ${error.message}` }],
        };
      }
    }
  );

  // 4. unittcms_list_folders
  server.tool(
    'unittcms_list_folders',
    'List folders (modules/suites) inside a project',
    {
      projectId: z.number().describe('The ID of the project'),
    },
    async ({ projectId }) => {
      try {
        const folders = await client.listFolders(projectId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(folders, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing folders for project #${projectId}: ${error.message}` }],
        };
      }
    }
  );

  // 5. unittcms_create_folder
  server.tool(
    'unittcms_create_folder',
    'Create a new folder (module or sub-module) in a project',
    {
      projectId: z.number().describe('The ID of the project'),
      name: z.string().describe('Folder / module name (e.g., "Authentication", "Checkout Flow")'),
      detail: z.string().optional().describe('Description of the folder / module'),
      parentFolderId: z.number().nullable().optional().describe('Parent folder ID if creating a nested sub-folder'),
    },
    async ({ projectId, name, detail, parentFolderId }) => {
      try {
        const folder = await client.createFolder(projectId, name, detail || '', parentFolderId || null);
        return {
          content: [
            {
              type: 'text',
              text: `Folder "${folder.name}" (ID: ${folder.id}) created successfully.\n\n` +
                JSON.stringify(folder, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error creating folder: ${error.message}` }],
        };
      }
    }
  );

  // 6. unittcms_list_cases
  server.tool(
    'unittcms_list_cases',
    'List test cases in a folder with optional filters',
    {
      folderId: z.number().describe('Folder ID to list test cases from'),
      search: z.string().optional().describe('Search keyword in title or description'),
      priority: z.string().optional().describe('Comma-separated priority numbers e.g. "0,1" (0=critical, 1=high, 2=medium, 3=low)'),
      type: z.string().optional().describe('Comma-separated type numbers e.g. "1,4"'),
      tag: z.string().optional().describe('Comma-separated tag IDs'),
    },
    async ({ folderId, search, priority, type, tag }) => {
      try {
        const cases = await client.listCases(folderId, { search, priority, type, tag });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cases, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing cases for folder #${folderId}: ${error.message}` }],
        };
      }
    }
  );

  // 7. unittcms_get_case
  server.tool(
    'unittcms_get_case',
    'Get full test case details including steps, preconditions, expected results, and tags',
    {
      caseId: z.number().describe('The ID of the test case'),
    },
    async ({ caseId }) => {
      try {
        const testcase = await client.getCase(caseId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(testcase, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting test case #${caseId}: ${error.message}` }],
        };
      }
    }
  );

  // 8. unittcms_create_case
  server.tool(
    'unittcms_create_case',
    'Create a new test case in a folder',
    {
      folderId: z.number().describe('The folder ID where this test case will belong'),
      title: z.string().describe('Title / summary of the test case'),
      description: z.string().optional().describe('Detailed description or scope of the test'),
      priority: z
        .union([z.number(), z.enum(['critical', 'high', 'medium', 'low'])])
        .optional()
        .describe('Priority level: 0/critical, 1/high, 2/medium, 3/low (default: medium)'),
      type: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Test type: 4/functional, 1/security, 2/performance, 7/smoke, 10/regression, etc. (default: functional)'),
      preConditions: z.string().optional().describe('Pre-conditions before executing this test'),
      expectedResults: z.string().optional().describe('Expected result / acceptance criteria of this test'),
      automationStatus: z.number().optional().default(1).describe('0=automated, 1=not required, 2=cannot be automated'),
    },
    async ({ folderId, title, description, priority, type, preConditions, expectedResults, automationStatus }) => {
      try {
        let priorityNum = 2;
        if (typeof priority === 'number') priorityNum = priority;
        else if (typeof priority === 'string' && priority.toLowerCase() in PRIORITY_MAP) {
          priorityNum = PRIORITY_MAP[priority.toLowerCase()];
        }

        let typeNum = 4; // functional default
        if (typeof type === 'number') typeNum = type;
        else if (typeof type === 'string' && type.toLowerCase() in TYPE_MAP) {
          typeNum = TYPE_MAP[type.toLowerCase()];
        }

        const newCase = await client.createCase(folderId, {
          title,
          description: description || '',
          priority: priorityNum,
          type: typeNum,
          preConditions: preConditions || '',
          expectedResults: expectedResults || '',
          automationStatus: automationStatus ?? 1,
          state: 0,
          template: 0,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Test case "${newCase.title}" (ID: ${newCase.id}) created in folder #${folderId} successfully.\n\n` +
                JSON.stringify(newCase, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error creating test case: ${error.message}` }],
        };
      }
    }
  );

  // 9. unittcms_bulk_create_cases
  server.tool(
    'unittcms_bulk_create_cases',
    'Create multiple test cases at once in a folder (ideal for AI generating suites from specifications)',
    {
      folderId: z.number().describe('Target folder ID'),
      cases: z.array(
        z.object({
          title: z.string().describe('Test case title'),
          description: z.string().optional().describe('Description'),
          priority: z.union([z.number(), z.enum(['critical', 'high', 'medium', 'low'])]).optional(),
          type: z.union([z.number(), z.string()]).optional(),
          preConditions: z.string().optional(),
          expectedResults: z.string().optional(),
        })
      ).describe('List of test cases to create'),
    },
    async ({ folderId, cases }) => {
      try {
        const createdCases = [];
        for (const item of cases) {
          let priorityNum = 2;
          if (typeof item.priority === 'number') priorityNum = item.priority;
          else if (typeof item.priority === 'string' && item.priority.toLowerCase() in PRIORITY_MAP) {
            priorityNum = PRIORITY_MAP[item.priority.toLowerCase()];
          }

          let typeNum = 4;
          if (typeof item.type === 'number') typeNum = item.type;
          else if (typeof item.type === 'string' && item.type.toLowerCase() in TYPE_MAP) {
            typeNum = TYPE_MAP[item.type.toLowerCase()];
          }

          const created = await client.createCase(folderId, {
            title: item.title,
            description: item.description || '',
            priority: priorityNum,
            type: typeNum,
            preConditions: item.preConditions || '',
            expectedResults: item.expectedResults || '',
            automationStatus: 1,
            state: 0,
            template: 0,
          });
          createdCases.push(created);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created ${createdCases.length} test cases in folder #${folderId}.\n\n` +
                JSON.stringify(createdCases, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error bulk creating cases: ${error.message}` }],
        };
      }
    }
  );

  // 10. unittcms_update_case
  server.tool(
    'unittcms_update_case',
    'Update an existing test case',
    {
      caseId: z.number().describe('The ID of the test case to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      priority: z.number().optional().describe('0=critical, 1=high, 2=medium, 3=low'),
      type: z.number().optional().describe('Test type number'),
      preConditions: z.string().optional().describe('New pre-conditions'),
      expectedResults: z.string().optional().describe('New expected results'),
    },
    async ({ caseId, ...updates }) => {
      try {
        const updated = await client.updateCase(caseId, updates);
        return {
          content: [
            {
              type: 'text',
              text: `Test case #${caseId} updated successfully.\n\n` + JSON.stringify(updated, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error updating test case #${caseId}: ${error.message}` }],
        };
      }
    }
  );

  // 11. unittcms_delete_cases
  server.tool(
    'unittcms_delete_cases',
    'Delete one or more test cases by IDs',
    {
      projectId: z.number().describe('The project ID containing these cases'),
      caseIds: z.array(z.number()).describe('Array of case IDs to delete'),
    },
    async ({ projectId, caseIds }) => {
      try {
        await client.bulkDeleteCases(projectId, caseIds);
        return {
          content: [
            {
              type: 'text',
              text: `Test cases [${caseIds.join(', ')}] deleted successfully.`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error deleting test cases: ${error.message}` }],
        };
      }
    }
  );

  // 12. unittcms_list_runs
  server.tool(
    'unittcms_list_runs',
    'List test runs in a project',
    {
      projectId: z.number().describe('The ID of the project'),
    },
    async ({ projectId }) => {
      try {
        const runs = await client.listRuns(projectId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(runs, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error listing runs for project #${projectId}: ${error.message}` }],
        };
      }
    }
  );

  // 13. unittcms_get_run
  server.tool(
    'unittcms_get_run',
    'Get test run summary and case execution status breakdown',
    {
      runId: z.number().describe('The test run ID'),
    },
    async ({ runId }) => {
      try {
        const runData = await client.getRun(runId);
        const cases = await client.listRunCases(runId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...runData,
                  totalCases: cases.length,
                  cases,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error getting run #${runId}: ${error.message}` }],
        };
      }
    }
  );

  // 14. unittcms_create_run
  server.tool(
    'unittcms_create_run',
    'Create a new test run (test execution session) for a project',
    {
      projectId: z.number().describe('The project ID'),
      name: z.string().describe('Run title e.g. "Release 1.4.0 Regression", "Sprint 23 Test Cycle"'),
      description: z.string().optional().describe('Description of testing scope or environment'),
      caseIds: z.array(z.number()).optional().describe('List of case IDs to include in this test run'),
    },
    async ({ projectId, name, description, caseIds }) => {
      try {
        const run = await client.createRun(projectId, name, description || '', caseIds || []);
        return {
          content: [
            {
              type: 'text',
              text: `Test run "${run.name}" (ID: ${run.id}) created with ${(caseIds || []).length} cases included.\n\n` +
                JSON.stringify(run, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error creating test run: ${error.message}` }],
        };
      }
    }
  );

  // 15. unittcms_update_run_case_result
  server.tool(
    'unittcms_update_run_case_result',
    'Update execution result of a test case in a test run (Passed, Failed, Blocked/Skipped, Retest)',
    {
      runId: z.number().describe('The test run ID'),
      caseId: z.number().describe('The test case ID'),
      status: z
        .union([z.number(), z.enum(['untested', 'passed', 'failed', 'retest', 'skipped'])])
        .describe('Result status: 0/untested, 1/passed, 2/failed, 3/retest, 4/skipped'),
      comment: z.string().optional().describe('Optional failure log or execution notes'),
    },
    async ({ runId, caseId, status, comment }) => {
      try {
        let statusNum = 0;
        if (typeof status === 'number') statusNum = status;
        else if (typeof status === 'string' && status.toLowerCase() in STATUS_MAP) {
          statusNum = STATUS_MAP[status.toLowerCase()];
        }

        // 1. Find the runCase id first
        const runCases = await client.listRunCases(runId);
        const existingRunCase = runCases.find((rc) => rc.caseId === caseId);

        if (existingRunCase) {
          await client.updateRunCases(runId, [
            {
              id: existingRunCase.id,
              caseId: caseId,
              status: statusNum,
            },
          ]);

          // If a comment is provided, attach it
          if (comment) {
            await client.addComment('RunCase', existingRunCase.id, comment);
          }

          return {
            content: [
              {
                type: 'text',
                text: `RunCase #${existingRunCase.id} (Case #${caseId} in Run #${runId}) status updated to ${statusNum} (${
                  typeof status === 'string' ? status : Object.keys(STATUS_MAP)[statusNum] || statusNum
                }).${comment ? ` Comment added.` : ''}`,
              },
            ],
          };
        } else {
          // If not in the run yet, add it
          const res = await client.updateRunCases(runId, [
            {
              caseId: caseId,
              status: statusNum,
            },
          ]);

          return {
            content: [
              {
                type: 'text',
                text: `Case #${caseId} added to Run #${runId} with status ${statusNum}.\n\n` +
                  JSON.stringify(res, null, 2),
              },
            ],
          };
        }
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error updating run case result: ${error.message}` }],
        };
      }
    }
  );

  // 16. unittcms_add_comment
  server.tool(
    'unittcms_add_comment',
    'Add a comment or execution note to a run case, test case, or test run',
    {
      commentableType: z
        .enum(['RunCase', 'Case', 'Run', 'runcase', 'case', 'run'])
        .describe('Target entity type: "RunCase", "Case", or "Run"'),
      commentableId: z.number().describe('ID of the runCase, test case, or test run'),
      content: z.string().describe('Comment content / error notes / stack trace'),
    },
    async ({ commentableType, commentableId, content }) => {
      try {
        const comment = await client.addComment(commentableType, commentableId, content);
        return {
          content: [
            {
              type: 'text',
              text: `Comment added to ${commentableType} #${commentableId} successfully.\n\n` +
                JSON.stringify(comment, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error adding comment: ${error.message}` }],
        };
      }
    }
  );
}
