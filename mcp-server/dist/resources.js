import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
export function registerResources(server, client) {
    // Static Resource: unittcms://projects
    server.resource('all_projects', 'unittcms://projects', async () => {
        const projects = await client.listProjects();
        return {
            contents: [
                {
                    uri: 'unittcms://projects',
                    mimeType: 'application/json',
                    text: JSON.stringify(projects, null, 2),
                },
            ],
        };
    });
    // Dynamic Resource: unittcms://projects/{projectId}
    server.resource('project_details', new ResourceTemplate('unittcms://projects/{projectId}', { list: undefined }), async (uri, { projectId }) => {
        const id = parseInt(projectId, 10);
        const project = await client.getProject(id);
        const folders = await client.listFolders(id);
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({ project, folders }, null, 2),
                },
            ],
        };
    });
    // Dynamic Resource: unittcms://runs/{runId}
    server.resource('run_details', new ResourceTemplate('unittcms://runs/{runId}', { list: undefined }), async (uri, { runId }) => {
        const id = parseInt(runId, 10);
        const runData = await client.getRun(id);
        const cases = await client.listRunCases(id);
        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify({ ...runData, cases }, null, 2),
                },
            ],
        };
    });
}
