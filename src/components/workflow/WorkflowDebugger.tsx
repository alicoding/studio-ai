/**
 * Temporary debugging component for workflow data flow
 */
import { useWorkflowStore } from '../../stores/workflows'

export function WorkflowDebugger() {
  const store = useWorkflowStore()

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="font-bold text-yellow-800">Workflow Debug Info:</h3>
      <div className="mt-2 text-sm">
        <p>
          <strong>Store workflows count:</strong> {Object.keys(store.workflows).length}
        </p>
        <p>
          <strong>Workflow list length:</strong> {store.workflowList.length}
        </p>
        <p>
          <strong>Active workflows:</strong> {store.getActiveWorkflows().length}
        </p>

        {store.workflowList.length > 0 && (
          <details className="mt-2">
            <summary>Workflow Details</summary>
            <pre className="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(store.workflowList, null, 2)}
            </pre>
          </details>
        )}

        <button
          onClick={() => store.fetchWorkflows()}
          className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Fetch Workflows
        </button>
      </div>
    </div>
  )
}
