import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '../components/ui/page-layout'
import { MessageSearch } from '../components/messages/MessageSearch'

export const Route = createFileRoute('/session-search')({
  component: SessionSearchPage,
})

function SessionSearchPage() {
  return (
    <PageLayout
      title="Search Claude Messages"
      description="Search through your messages from Claude sessions"
    >
      <div className="h-[calc(100vh-12rem)]">
        <MessageSearch />
      </div>
    </PageLayout>
  )
}
