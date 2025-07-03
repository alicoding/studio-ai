interface Todo {
  id?: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority?: string
}

interface TodoListProps {
  todos: Todo[]
}

export function TodoList({ todos }: TodoListProps) {
  const getPriorityIndicator = (priority?: string) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return ''
    }
  }

  const getStatusIndicator = (status: string) => {
    return status === 'in_progress' ? '▶' : ''
  }

  return (
    <div className="space-y-1">
      {todos.map((todo, index) => (
        <div key={todo.id || index} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5">{todo.status === 'completed' ? '☒' : '☐'}</span>
          <div className="flex items-start gap-1">
            {todo.priority && <span>{getPriorityIndicator(todo.priority)}</span>}
            {todo.status === 'in_progress' && <span>{getStatusIndicator(todo.status)}</span>}
            <span className={todo.status === 'completed' ? 'line-through opacity-60' : ''}>
              {todo.content}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}