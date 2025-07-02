/**
 * IPC Communication Library - Main Exports
 * 
 * Inter-process communication for agent @mentions and broadcasts
 * Following plan.md: Unix domain sockets with retry logic
 */

export { IPCServer } from './IPCServer.js'
export { IPCClient } from './IPCClient.js'
export { MessageRouter } from './MessageRouter.js'
export { RetryHandler } from './RetryHandler.js'

export type {
  IPCMessage,
  IPCServerOptions,
  IPCClientOptions,
  MentionMessage
} from './types.js'

/**
 * Convenience function to start IPC server for an agent
 */
export async function startAgentIPC(agentId: string) {
  const server = new IPCServer({ agentId })
  await server.start()
  
  console.log(`IPC server started for agent ${agentId}`)
  return server
}

/**
 * Convenience function to send @mention message
 */
export async function sendMention(
  fromAgentId: string,
  targetAgentId: string,
  content: string,
  projectId: string
): Promise<boolean> {
  const client = new IPCClient()
  return await client.sendMention(fromAgentId, targetAgentId, content, projectId)
}

/**
 * Convenience function to broadcast to all agents in project
 */
export async function broadcastToProject(
  message: string,
  fromAgentId: string,
  projectId: string
) {
  const router = MessageRouter.getInstance()
  return await router.broadcastToProject(message, fromAgentId, projectId)
}