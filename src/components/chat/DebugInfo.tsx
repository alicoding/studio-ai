/**
 * Debug Info Component - Shows current AI capabilities
 * 
 * KISS: Simple debug helper
 */

import { useCapabilityStore } from '../../lib/ai/orchestration/CapabilityManager'
import { Card } from '../ui/card'

export function DebugInfo() {
  const capabilities = useCapabilityStore(state => state.capabilities)
  
  return (
    <Card className="p-4 m-4">
      <h3 className="font-bold mb-2">AI Capabilities</h3>
      <div className="space-y-2">
        {Object.entries(capabilities).length === 0 ? (
          <p className="text-sm text-muted-foreground">No capabilities configured</p>
        ) : (
          Object.entries(capabilities).map(([id, cap]) => (
            <div key={id} className="text-sm">
              <span className="font-medium">#{id}</span> - {cap.name} ({cap.models.primary})
            </div>
          ))
        )}
      </div>
    </Card>
  )
}