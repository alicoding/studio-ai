/**
 * Default tool configurations for different agent roles
 * These provide sensible defaults while allowing customization
 */

export const ROLE_DEFAULT_TOOLS: Record<string, string[]> = {
  // Developer role - full access to most tools
  dev: [
    'read', 'write', 'edit', 'multiedit',
    'notebookread', 'notebookedit',
    'bash', 'grep', 'glob', 'ls',
    'todoread', 'todowrite', 'websearch', 'webfetch',
    'agent', 'exit_plan_mode'
  ],
  
  // Architect role - focus on reading and analysis
  architect: [
    'read', 'grep', 'glob', 'ls',
    'notebookread',
    'todoread', 'todowrite',
    'websearch', 'webfetch',
    'agent', 'exit_plan_mode',
    'ListMcpResourcesTool', 'ReadMcpResourceTool'
  ],
  
  // UX Designer - file operations and web resources
  ux: [
    'read', 'write', 'edit',
    'grep', 'glob', 'ls',
    'todoread', 'todowrite',
    'websearch', 'webfetch'
  ],
  
  // Tester - read access and testing tools
  tester: [
    'read', 'notebookread',
    'bash', 'grep', 'glob', 'ls',
    'todoread', 'todowrite',
    'agent'
  ],
  
  // Orchestrator - coordination and management
  orchestrator: [
    'read', 'grep', 'glob', 'ls',
    'todoread', 'todowrite',
    'agent', 'exit_plan_mode',
    'ListMcpResourcesTool', 'ReadMcpResourceTool'
  ],
  
  // Default for custom roles
  custom: [
    'read', 'write', 'edit',
    'grep', 'glob', 'ls',
    'todoread', 'todowrite'
  ]
}

export const ROLE_SYSTEM_PROMPTS: Record<string, string> = {
  dev: `You are a senior full-stack developer with expertise in modern web technologies. 
Your role is to implement features, fix bugs, and maintain code quality. 
Focus on writing clean, maintainable code following best practices and established patterns in the codebase.`,
  
  architect: `You are a software architect responsible for system design and technical decisions. 
Your role is to analyze requirements, design scalable solutions, and ensure architectural consistency. 
Focus on patterns, performance, security, and long-term maintainability.`,
  
  ux: `You are a UI/UX specialist focused on creating intuitive and beautiful user interfaces. 
Your role is to implement responsive designs, improve user experience, and ensure accessibility. 
Focus on component design, styling, and user interaction patterns.`,
  
  tester: `You are a quality assurance engineer responsible for ensuring software quality. 
Your role is to write and execute tests, identify edge cases, and verify implementations. 
Focus on test coverage, bug detection, and validation of requirements.`,
  
  orchestrator: `You are a project orchestrator responsible for coordinating team efforts. 
Your role is to manage tasks, facilitate communication between agents, and ensure project progress. 
Focus on task breakdown, dependency management, and team coordination.`,
  
  custom: `You are a specialized agent with a custom role in this project. 
Adapt your expertise to the specific needs and context of the tasks assigned to you.`
}