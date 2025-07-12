/**
 * StudioProjectService - Native Studio Project Management
 *
 * SOLID: Single responsibility - Studio project operations
 * DRY: Reuses database service and agent config service
 * KISS: Clean separation from Claude Desktop projects
 * Library-First: Uses Drizzle ORM through database service
 */
import type { AgentConfig } from './UnifiedAgentConfigService';
export interface CreateProjectInput {
    name: string;
    description?: string;
    workspacePath: string;
    template?: string;
    claudeInstructions?: string;
    agents?: AgentAssignment[];
    teamTemplateId?: string;
    settings?: ProjectSettings;
}
export interface AgentAssignment {
    role: string;
    agentConfigId: string;
    customName?: string;
    customTools?: string[];
}
export interface ProjectSettings {
    envVars?: Record<string, string>;
    disabledTools?: string[];
    mcpServers?: string[];
    defaultModel?: string;
}
export interface StudioProject {
    id: string;
    name: string;
    description?: string;
    workspacePath: string;
    settings?: ProjectSettings;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt?: Date | null;
}
export interface ProjectWithAgents extends StudioProject {
    agents: Array<{
        role: string;
        agentConfigId: string;
        customTools?: string[];
        agentConfig?: AgentConfig | null;
    }>;
}
export declare class StudioProjectService {
    private agentConfigService;
    constructor();
    /**
     * Create a new Studio project with optional agent assignments
     */
    createProject(input: CreateProjectInput): Promise<ProjectWithAgents>;
    /**
     * Get a project with its agent assignments
     */
    getProjectWithAgents(projectId: string): Promise<ProjectWithAgents>;
    /**
     * List all Studio projects
     */
    listProjects(): Promise<StudioProject[]>;
    /**
     * Update project settings
     */
    updateProject(projectId: string, updates: Partial<CreateProjectInput>): Promise<StudioProject>;
    /**
     * Update project's last activity timestamp
     */
    updateLastActivity(projectId: string): Promise<void>;
    /**
     * Delete a project and its assignments
     */
    deleteProject(projectId: string, options?: {
        deleteWorkspace?: boolean;
    }): Promise<void>;
    /**
     * Add an agent to a project
     */
    addAgentToProject(projectId: string, assignment: AgentAssignment): Promise<void>;
    /**
     * Remove an agent from a project
     */
    removeAgentFromProject(projectId: string, role: string): Promise<void>;
    /**
     * Get project agents with short IDs
     */
    getProjectAgentsWithShortIds(projectId: string): Promise<Array<{
        shortId: string;
        role: string;
        agentConfigId: string;
        customTools?: string[];
        agentConfig?: AgentConfig | null;
    }>>;
    /**
     * Get team template
     */
    private getTeamTemplate;
    /**
     * Get project agents in format expected by WorkflowOrchestrator
     * Returns agents with short IDs as the main ID
     */
    getProjectAgents(projectId: string): Promise<Array<{
        id: string;
        configId?: string;
        name: string;
        role: string;
        status: 'online' | 'offline';
        sessionId: string | null;
        messageCount: number;
        totalTokens: number;
        lastMessage: string;
        hasSession: boolean;
    }>>;
    /**
     * Create a team template from a project
     */
    createTeamTemplateFromProject(projectId: string, templateName: string, description?: string): Promise<string>;
}
//# sourceMappingURL=StudioProjectService.d.ts.map