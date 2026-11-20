import dotenv from 'dotenv';
dotenv.config();
export class UnitTCMSClient {
    baseUrl;
    email;
    password;
    token = null;
    tokenExpiry = 0;
    constructor(options) {
        this.baseUrl = options?.baseUrl || process.env.UNITTCMS_BASE_URL || 'http://localhost:8001';
        // Remove trailing slash if present
        this.baseUrl = this.baseUrl.replace(/\/+$/, '');
        this.token = options?.token || process.env.UNITTCMS_TOKEN || null;
        this.email = options?.email || process.env.UNITTCMS_EMAIL || 'admin@example.com';
        this.password = options?.password || process.env.UNITTCMS_PASSWORD || 'password';
    }
    /**
     * Ensure we have a valid JWT token.
     */
    async ensureToken() {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }
        if (this.token && !this.password) {
            // Predefined token without password
            return this.token;
        }
        // Sign in via API to obtain fresh token
        const signinUrl = `${this.baseUrl}/users/signin`;
        const res = await fetch(signinUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: this.email,
                password: this.password,
            }),
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to authenticate with UnitTCMS (${res.status}): ${errorText}`);
        }
        const data = (await res.json());
        this.token = data.access_token;
        // Buffer 5 minutes before actual expiry
        this.tokenExpiry = data.expires_at ? data.expires_at - 300000 : Date.now() + 23 * 3600 * 1000;
        return this.token;
    }
    async request(path, options = {}) {
        const token = await this.ensureToken();
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        };
        const response = await fetch(url, {
            ...options,
            headers,
        });
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status} ${response.statusText}`;
            try {
                const errJson = await response.json();
                errorMessage = errJson.error || errJson.message || JSON.stringify(errJson);
            }
            catch {
                const text = await response.text();
                if (text)
                    errorMessage = text;
            }
            throw new Error(`UnitTCMS API Error [${response.status}]: ${errorMessage}`);
        }
        // For 204 No Content
        if (response.status === 204) {
            return {};
        }
        return (await response.json());
    }
    // --- PROJECTS ---
    async listProjects(onlyUserProjects = false) {
        return this.request(`/projects?onlyUserProjects=${onlyUserProjects}`);
    }
    async getProject(projectId) {
        return this.request(`/projects/${projectId}`);
    }
    async createProject(name, detail = '', isPublic = true) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, detail, isPublic }),
        });
    }
    // --- FOLDERS ---
    async listFolders(projectId) {
        return this.request(`/folders?projectId=${projectId}`);
    }
    async createFolder(projectId, name, detail = '', parentFolderId = null) {
        return this.request(`/folders?projectId=${projectId}`, {
            method: 'POST',
            body: JSON.stringify({ name, detail, parentFolderId }),
        });
    }
    // --- CASES ---
    async listCases(folderId, filters) {
        const params = new URLSearchParams({ folderId: folderId.toString() });
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.priority)
            params.append('priority', filters.priority);
        if (filters?.type)
            params.append('type', filters.type);
        if (filters?.tag)
            params.append('tag', filters.tag);
        return this.request(`/cases?${params.toString()}`);
    }
    async getCase(caseId) {
        return this.request(`/cases/${caseId}`);
    }
    async createCase(folderId, data) {
        const payload = {
            title: data.title,
            description: data.description || '',
            state: data.state ?? 0,
            priority: data.priority ?? 2, // Medium default
            type: data.type ?? 4, // Functional default
            automationStatus: data.automationStatus ?? 1, // Automation not required default
            template: data.template ?? 0, // Text template
            preConditions: data.preConditions || '',
            expectedResults: data.expectedResults || '',
        };
        return this.request(`/cases?folderId=${folderId}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    async updateCase(caseId, updates) {
        return this.request(`/cases/${caseId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }
    async bulkDeleteCases(projectId, caseIds) {
        await this.request(`/cases/bulkdelete?projectId=${projectId}`, {
            method: 'POST',
            body: JSON.stringify({ caseIds }),
        });
    }
    // --- RUNS ---
    async listRuns(projectId) {
        return this.request(`/runs?projectId=${projectId}`);
    }
    async getRun(runId) {
        return this.request(`/runs/${runId}`);
    }
    async createRun(projectId, name, description = '', caseIds = []) {
        const run = await this.request(`/runs?projectId=${projectId}`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                configurations: 0,
                description,
                state: 0,
            }),
        });
        // If caseIds are provided, attach them to the run
        if (caseIds.length > 0 && run.id) {
            const runCasesPayload = caseIds.map((cid) => ({
                caseId: cid,
                status: 0, // Untested
            }));
            await this.updateRunCases(run.id, runCasesPayload);
        }
        return run;
    }
    async listRunCases(runId, assigneeUserId) {
        let query = `?runId=${runId}`;
        if (assigneeUserId !== undefined) {
            query += `&assigneeUserId=${assigneeUserId}`;
        }
        return this.request(`/runcases${query}`);
    }
    async updateRunCases(runId, runCases) {
        const formatted = runCases.map((rc) => {
            let editState = rc.editState;
            if (!editState) {
                if (rc.status === null) {
                    editState = 'deleted';
                }
                else if (rc.id) {
                    editState = 'changed';
                }
                else {
                    editState = 'new';
                }
            }
            return {
                ...rc,
                editState,
            };
        });
        return this.request(`/runcases/update?runId=${runId}`, {
            method: 'POST',
            body: JSON.stringify(formatted),
        });
    }
    // --- COMMENTS ---
    async addComment(commentableType, commentableId, content) {
        const normalizedType = commentableType.toLowerCase() === 'runcase'
            ? 'RunCase'
            : commentableType.toLowerCase() === 'case'
                ? 'Case'
                : 'Run';
        return this.request(`/comments?commentableType=${normalizedType}&commentableId=${commentableId}`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }
}
