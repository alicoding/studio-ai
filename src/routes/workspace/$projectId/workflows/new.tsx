import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace/$projectId/workflows/new')({
  component: NewWorkflowInProject,
})

function NewWorkflowInProject() {
  const navigate = useNavigate()
  const { projectId } = useParams({ from: '/workspace/$projectId/workflows/new' })

  console.log('NewWorkflowInProject rendering for projectId:', projectId)

  const handleClose = () => {
    navigate({ to: `/workspace/${projectId}` })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'red',
        zIndex: 9999,
        color: 'white',
        padding: '20px',
      }}
    >
      <h1>WORKFLOW BUILDER ROUTE TEST</h1>
      <p>Project ID: {projectId}</p>
      <p>This proves the route is working!</p>
      <button onClick={handleClose} style={{ padding: '10px', marginTop: '10px' }}>
        Close
      </button>
    </div>
  )
}
