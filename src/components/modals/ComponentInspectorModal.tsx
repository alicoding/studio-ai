import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Label } from '../ui/label'
import { Copy, Send } from 'lucide-react'
import { useAgentStore } from '../../stores'
import { toast } from 'sonner'

interface ComponentInspectorModalProps {
  isOpen: boolean
  onClose: () => void
  componentInfo: string
  onSend: (agentId: string) => void
}

export function ComponentInspectorModal({ 
  isOpen, 
  onClose, 
  componentInfo,
  onSend 
}: ComponentInspectorModalProps) {
  const { agents, selectedAgentId } = useAgentStore()
  const [selectedAgent, setSelectedAgent] = useState(selectedAgentId || '')
  
  const projectAgents = agents
  
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(componentInfo)
      toast.success('Component info copied to clipboard!')
      onClose()
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }
  
  const handleSendToAgent = () => {
    if (!selectedAgent) {
      toast.error('Please select an agent')
      return
    }
    onSend(selectedAgent)
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Component Info</DialogTitle>
          <DialogDescription>
            Choose where to send the captured component information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {projectAgents.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <RadioGroup value={selectedAgent} onValueChange={setSelectedAgent}>
                  {projectAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted">
                      <RadioGroupItem value={agent.id} id={agent.id} />
                      <Label 
                        htmlFor={agent.id} 
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground">{agent.role}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={handleSendToAgent}
                  disabled={!selectedAgent}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Agent
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No agents available in this project
              </p>
              <Button onClick={handleCopyToClipboard} className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          )}
        </div>
        
        {/* Preview of what will be sent */}
        <div className="border rounded p-3 bg-muted/50 max-h-32 overflow-y-auto">
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {componentInfo.slice(0, 200)}...
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}