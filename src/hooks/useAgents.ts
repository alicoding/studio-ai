import { useState } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  status: 'ready' | 'online' | 'busy' | 'offline'
  tokens: number
  maxTokens: number
  lastMessage?: string
  sessionId?: string
  pid?: number
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'dev-1',
    name: 'Frontend Dev',
    role: 'dev',
    status: 'online',
    tokens: 15000,
    maxTokens: 200000,
    lastMessage: 'Component styling complete',
    sessionId: 'session-1',
  },
  {
    id: 'ux-1',
    name: 'UX Designer',
    role: 'ux',
    status: 'busy',
    tokens: 8500,
    maxTokens: 200000,
    lastMessage: 'Working on wireframes...',
    sessionId: 'session-2',
  },
  {
    id: 'backend-1',
    name: 'Backend Dev',
    role: 'dev',
    status: 'offline',
    tokens: 0,
    maxTokens: 200000,
    lastMessage: undefined,
    sessionId: 'session-3',
  },
]

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS)

  // UI-first approach: disable WebSocket for now to prevent re-render issues
  // useEffect(() => {
  //   const handleInitialState = (data: { agents: Agent[] }) => {
  //     setAgents(data.agents)
  //   }

  //   const handleAgentRegistered = (agent: Agent) => {
  //     setAgents(prev => [...prev, agent])
  //   }

  //   const handleAgentUnregistered = (agentId: string) => {
  //     setAgents(prev => prev.filter(a => a.id !== agentId))
  //   }

  //   const handleStatusChanged = (data: { agentId: string; status: Agent['status'] }) => {
  //     setAgents(prev => prev.map(a =>
  //       a.id === data.agentId ? { ...a, status: data.status } : a
  //     ))
  //   }

  //   const handleTokenUsage = (data: { agentId: string; tokens: number; maxTokens: number }) => {
  //     setAgents(prev => prev.map(a =>
  //       a.id === data.agentId
  //         ? { ...a, tokens: data.tokens, maxTokens: data.maxTokens }
  //         : a
  //     ))
  //   }

  //   on('initial-state', handleInitialState)
  //   on('agent:registered', handleAgentRegistered)
  //   on('agent:unregistered', handleAgentUnregistered)
  //   on('agent:status-changed', handleStatusChanged)
  //   on('agent:token-usage', handleTokenUsage)

  //   return () => {
  //     off('initial-state', handleInitialState)
  //     off('agent:registered', handleAgentRegistered)
  //     off('agent:unregistered', handleAgentUnregistered)
  //     off('agent:status-changed', handleStatusChanged)
  //     off('agent:token-usage', handleTokenUsage)
  //   }
  // }, [on, off])

  const updateAgentStatus = (agentId: string, status: Agent['status']) => {
    // UI-first: Update local state instead of WebSocket
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, status } : a)))
    console.log('Status updated (UI-first):', { agentId, status })
  }

  const sendMessage = (from: string, to: string, content: string) => {
    console.log('Send message (UI-first):', { from, to, content })
  }

  const removeAgent = (agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
    console.log('Agent removed (UI-first):', agentId)
  }

  return {
    agents,
    updateAgentStatus,
    sendMessage,
    removeAgent,
  }
}
