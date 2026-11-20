import dotenv from 'dotenv';
dotenv.config();

export interface Project {
  id: number;
  name: string;
  detail?: string;
  isPublic?: boolean;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Folder {
  id: number;
  name: string;
  detail?: string;
  projectId: number;
  parentFolderId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestCase {
  id: number;
  title: string;
  state: number;
  priority: number;
  type: number;
  automationStatus: number;
  description?: string;
  template: number;
  preConditions?: string;
  expectedResults?: string;
  folderId: number;
  createdAt?: string;
  updatedAt?: string;
  Steps?: Array<{ id: number; action: string; result: string; caseSteps?: { stepNo: number } }>;
  Tags?: Array<{ id: number; name: string }>;
}

export interface TestRun {
  id: number;
  name: string;
  configurations?: string | number;
  description?: string;
  state?: number;
  projectId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RunCase {
  id: number;
  runId: number;
  caseId: number;
  status: number; // 0=untested, 1=passed, 2=failed, 3=retest, 4=skipped
  assigneeUserId?: number | null;
  Case?: TestCase;
}

export class UnitTCMSClient {
  private baseUrl: string;
  private email: string;
  private password?: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(options?: { baseUrl?: string; token?: string; email?: string; password?: string }) {
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
  public async ensureToken(): Promise<string> {
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

    const data = (await res.json()) as { access_token: string; expires_at?: number };
    this.token = data.access_token;
    // Buffer 5 minutes before actual expiry
    this.tokenExpiry = data.expires_at ? data.expires_at - 300000 : Date.now() + 23 * 3600 * 1000;
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureToken();
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> || {}),
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
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new Error(`UnitTCMS API Error [${response.status}]: ${errorMessage}`);
    }

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  // --- PROJECTS ---
  public async listProjects(onlyUserProjects: boolean = false): Promise<Project[]> {
    return this.request<Project[]>(`/projects?onlyUserProjects=${onlyUserProjects}`);
  }

  public async getProject(projectId: number): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  public async createProject(name: string, detail: string = '', isPublic: boolean = true): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, detail, isPublic }),
    });
  }

  // --- FOLDERS ---
  public async listFolders(projectId: number): Promise<Folder[]> {
    return this.request<Folder[]>(`/folders?projectId=${projectId}`);
  }

  public async createFolder(
    projectId: number,
    name: string,
    detail: string = '',
    parentFolderId: number | null = null
  ): Promise<Folder> {
    return this.request<Folder>(`/folders?projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ name, detail, parentFolderId }),
    });
  }

  // --- CASES ---
  public async listCases(
    folderId: number,
    filters?: { search?: string; priority?: string; type?: string; tag?: string }
  ): Promise<TestCase[]> {
    const params = new URLSearchParams({ folderId: folderId.toString() });
    if (filters?.search) params.append('search', filters.search);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.tag) params.append('tag', filters.tag);
    return this.request<TestCase[]>(`/cases?${params.toString()}`);
  }

  public async getCase(caseId: number): Promise<TestCase> {
    return this.request<TestCase>(`/cases/${caseId}`);
  }

  public async createCase(
    folderId: number,
    data: {
      title: string;
      description?: string;
      state?: number;
      priority?: number;
      type?: number;
      automationStatus?: number;
      template?: number;
      preConditions?: string;
      expectedResults?: string;
    }
  ): Promise<TestCase> {
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
    return this.request<TestCase>(`/cases?folderId=${folderId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateCase(caseId: number, updates: Partial<TestCase>): Promise<TestCase> {
    return this.request<TestCase>(`/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async bulkDeleteCases(projectId: number, caseIds: number[]): Promise<void> {
    await this.request<void>(`/cases/bulkdelete?projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ caseIds }),
    });
  }

  // --- RUNS ---
  public async listRuns(projectId: number): Promise<TestRun[]> {
    return this.request<TestRun[]>(`/runs?projectId=${projectId}`);
  }

  public async getRun(runId: number): Promise<{ run: TestRun; statusCounts: Array<{ status: number; count: number }> }> {
    return this.request<{ run: TestRun; statusCounts: Array<{ status: number; count: number }> }>(`/runs/${runId}`);
  }

  public async createRun(
    projectId: number,
    name: string,
    description: string = '',
    caseIds: number[] = []
  ): Promise<TestRun> {
    const run = await this.request<TestRun>(`/runs?projectId=${projectId}`, {
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

  public async listRunCases(runId: number, assigneeUserId?: number | 'null'): Promise<RunCase[]> {
    let query = `?runId=${runId}`;
    if (assigneeUserId !== undefined) {
      query += `&assigneeUserId=${assigneeUserId}`;
    }
    return this.request<RunCase[]>(`/runcases${query}`);
  }

  public async updateRunCases(
    runId: number,
    runCases: Array<{ id?: number; caseId: number; status?: number | null; editState?: 'new' | 'changed' | 'deleted' | 'notChanged' }>
  ): Promise<any> {
    const formatted = runCases.map((rc) => {
      let editState = rc.editState;
      if (!editState) {
        if (rc.status === null) {
          editState = 'deleted';
        } else if (rc.id) {
          editState = 'changed';
        } else {
          editState = 'new';
        }
      }
      return {
        ...rc,
        editState,
      };
    });

    return this.request<any>(`/runcases/update?runId=${runId}`, {
      method: 'POST',
      body: JSON.stringify(formatted),
    });
  }

  // --- COMMENTS ---
  public async addComment(
    commentableType: 'RunCase' | 'Case' | 'Run' | 'runcase' | 'case' | 'run',
    commentableId: number,
    content: string
  ): Promise<any> {
    const normalizedType =
      commentableType.toLowerCase() === 'runcase'
        ? 'RunCase'
        : commentableType.toLowerCase() === 'case'
        ? 'Case'
        : 'Run';

    return this.request<any>(`/comments?commentableType=${normalizedType}&commentableId=${commentableId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}
