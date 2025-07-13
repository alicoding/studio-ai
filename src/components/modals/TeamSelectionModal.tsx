import { Modal } from '../shared/Modal'
import { useTeams } from '../../hooks/useTeams'
import { TeamTemplate } from '../../types/teams'
import { Users } from 'lucide-react'

interface TeamSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTeam: (team: TeamTemplate) => void
}

export function TeamSelectionModal({ isOpen, onClose, onSelectTeam }: TeamSelectionModalProps) {
  const { teams, loading } = useTeams()

  const handleSelectTeam = (team: TeamTemplate) => {
    onSelectTeam(team)
    onClose()
  }

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'orchestrator':
        return '#9333ea'
      case 'architect':
        return '#3b82f6'
      case 'dev':
        return '#10b981'
      case 'ux':
        return '#f59e0b'
      case 'tester':
        return '#ef4444'
      default:
        return '#666'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Load Team Template" className="max-w-2xl">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Loading team templates...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team templates available</p>
            <p className="text-xs mt-2">Create team templates in the Teams page first</p>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectTeam(team)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground">{team.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {team.agents.length} agent{team.agents.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {team.description && (
                <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {team.agents.map((agent, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1"
                    style={{ backgroundColor: getRoleColors(agent.role) }}
                  >
                    <span>{agent.role}</span>
                    {agent.name && <span className="opacity-75">({agent.name})</span>}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}