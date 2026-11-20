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
    Steps?: Array<{
        id: number;
        action: string;
        result: string;
        caseSteps?: {
            stepNo: number;
        };
    }>;
    Tags?: Array<{
        id: number;
        name: string;
    }>;
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
    status: number;
    assigneeUserId?: number | null;
    Case?: TestCase;
}
export declare class UnitTCMSClient {
    private baseUrl;
    private email;
    private password?;
    private token;
    private tokenExpiry;
    constructor(options?: {
        baseUrl?: string;
        token?: string;
        email?: string;
        password?: string;
    });
    /**
     * Ensure we have a valid JWT token.
     */
    ensureToken(): Promise<string>;
    private request;
    listProjects(onlyUserProjects?: boolean): Promise<Project[]>;
    getProject(projectId: number): Promise<Project>;
    createProject(name: string, detail?: string, isPublic?: boolean): Promise<Project>;
    listFolders(projectId: number): Promise<Folder[]>;
    createFolder(projectId: number, name: string, detail?: string, parentFolderId?: number | null): Promise<Folder>;
    listCases(folderId: number, filters?: {
        search?: string;
        priority?: string;
        type?: string;
        tag?: string;
    }): Promise<TestCase[]>;
    getCase(caseId: number): Promise<TestCase>;
    createCase(folderId: number, data: {
        title: string;
        description?: string;
        state?: number;
        priority?: number;
        type?: number;
        automationStatus?: number;
        template?: number;
        preConditions?: string;
        expectedResults?: string;
    }): Promise<TestCase>;
    updateCase(caseId: number, updates: Partial<TestCase>): Promise<TestCase>;
    bulkDeleteCases(projectId: number, caseIds: number[]): Promise<void>;
    listRuns(projectId: number): Promise<TestRun[]>;
    getRun(runId: number): Promise<{
        run: TestRun;
        statusCounts: Array<{
            status: number;
            count: number;
        }>;
    }>;
    createRun(projectId: number, name: string, description?: string, caseIds?: number[]): Promise<TestRun>;
    listRunCases(runId: number, assigneeUserId?: number | 'null'): Promise<RunCase[]>;
    updateRunCases(runId: number, runCases: Array<{
        id?: number;
        caseId: number;
        status?: number | null;
        editState?: 'new' | 'changed' | 'deleted' | 'notChanged';
    }>): Promise<any>;
    addComment(commentableType: 'RunCase' | 'Case' | 'Run' | 'runcase' | 'case' | 'run', commentableId: number, content: string): Promise<any>;
}
