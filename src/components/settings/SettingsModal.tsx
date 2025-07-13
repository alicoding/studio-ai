import { Modal } from '../shared/Modal'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Theme</label>
          <select className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option>Light</option>
            <option>Dark</option>
            <option>Auto</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Auto-save interval</label>
          <select className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option>30 seconds</option>
            <option>1 minute</option>
            <option>5 minutes</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            defaultChecked
            className="w-4 h-4 text-primary bg-input border border-border rounded focus:ring-2 focus:ring-ring"
          />
          <label className="text-sm font-medium text-foreground">Enable notifications</label>
        </div>
      </div>

      <div className="flex justify-end gap-3 p-6 border-t">
        <button
          type="button"
          className="px-4 py-2 text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="px-4 py-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
          onClick={onClose}
        >
          Save Settings
        </button>
      </div>
    </Modal>
  )
}
