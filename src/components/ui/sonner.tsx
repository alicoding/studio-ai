import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'bg-card text-card-foreground border border-border shadow-lg rounded-lg p-4',
          title: 'font-semibold',
          description: 'text-muted-foreground text-sm mt-1',
          actionButton: 'bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium',
          cancelButton: 'bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md text-sm font-medium',
          success: 'bg-card text-green-500 border-green-500/20',
          error: 'bg-card text-red-500 border-red-500/20',
          warning: 'bg-card text-yellow-500 border-yellow-500/20',
          info: 'bg-card text-blue-500 border-blue-500/20',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
