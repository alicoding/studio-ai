/**
 * Unified Agent Configuration Service
 *
 * SOLID: Single responsibility for agent config management
 * DRY: Eliminates duplicate agent config handling across services
 * KISS: Simple interface for agent config CRUD operations
 * Library-First: Uses Drizzle ORM for type-safe database operations
 */
import type { ToolPermission } from '../../../src/types/tool-permissions';
export interface AgentConfig {
    id: string;
    name: string;
    role: string;
    systemPrompt: string;
    tools: string[] | ToolPermission[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    createdAt: string;
    updatedAt: string;
}
export interface AgentRoleAssignment {
    id: string;
    projectId: string;
    role: string;
    agentConfigId: string;
    customTools?: string[] | ToolPermission[];
    hasCustomTools: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CreateAgentConfigRequest {
    id?: string;
    name: string;
    role: string;
    systemPrompt: string;
    tools?: string[] | ToolPermission[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface UpdateAgentConfigRequest {
    name?: string;
    role?: string;
    systemPrompt?: string;
    tools?: string[] | ToolPermission[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
export interface AssignRoleRequest {
    projectId: string;
    role: string;
    agentConfigId: string;
    customTools?: string[] | ToolPermission[];
    hasCustomTools?: boolean;
}
/**
 * Service for managing agent configurations and role assignments in SQLite
 */
export declare class UnifiedAgentConfigService {
    private static instance;
    private cache;
    private roleCache;
    private cacheExpiry;
    private toolPermissionService;
    private constructor();
    private getDatabase;
    static getInstance(): UnifiedAgentConfigService;
    /**
     * Get all agent configurations
     */
    getAllConfigs(): Promise<AgentConfig[]>;
    /**
     * Get agent configuration by ID
     */
    getConfig(id: string): Promise<AgentConfig | null>;
    /**
     * Get multiple agent configurations by IDs (batch operation)
     */
    getBatchConfigs(ids: string[]): Promise<AgentConfig[]>;
    /**
     * Create new agent configuration
     */
    createConfig(request: CreateAgentConfigRequest): Promise<AgentConfig>;
    /**
     * Update agent configuration
     */
    updateConfig(id: string, request: UpdateAgentConfigRequest): Promise<AgentConfig | null>;
    /**
     * Delete agent configuration
     */
    deleteConfig(id: string): Promise<boolean>;
    /**
     * Assign agent config to role in project
     */
    assignRole(request: AssignRoleRequest): Promise<AgentRoleAssignment>;
    /**
     * Get role assignments for project
     */
    getProjectRoleAssignments(projectId: string): Promise<AgentRoleAssignment[]>;
    /**
     * Get role assignments for multiple projects (batch operation)
     */
    getBatchProjectRoleAssignments(projectIds: string[]): Promise<Map<string, AgentRoleAssignment[]>>;
    /**
     * Get role assignment for specific role in project
     */
    getRoleAssignment(projectId: string, role: string): Promise<AgentRoleAssignment | null>;
    /**
     * Remove role assignment
     */
    removeRoleAssignment(projectId: string, role: string): Promise<boolean>;
    /**
     * Clear all caches (for testing or manual refresh)
     */
    clearCache(): void;
    /**
     * Map database record to AgentConfig interface
     */
    private mapConfigFromDb;
    /**
     * Map database record to AgentRoleAssignment interface
     */
    private mapRoleAssignmentFromDb;
    /**
     * Get effective tool permissions for an agent in a project
     */
    getEffectiveToolPermissions(projectId: string, role: string): Promise<ToolPermission[]>;
    /**
     * Update tool permissions for an agent config
     */
    updateToolPermissions(agentConfigId: string, tools: ToolPermission[]): Promise<AgentConfig | null>;
    /**
     * Apply a permission preset to an agent
     */
    applyPermissionPreset(agentConfigId: string, presetName: string): Promise<AgentConfig | null>;
    /**
     * Ensure all agent configurations have proper tool permissions
     * This method can be called manually to run the tool permissions migration
     */
    ensureToolPermissions(): Promise<{
        updatedCount: number;
        alreadyMigratedCount: number;
        errorCount: number;
        totalProcessed: number;
    }>;
}
//# sourceMappingURL=UnifiedAgentConfigService.d.ts.map