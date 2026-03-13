import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { EmptyState } from './EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useChatStore } from '@/store/useChatStore'

export function AppLayout() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  const handleSelectConversation = () => {
    setMobileChatOpen(true)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 h-full
          ${mobileChatOpen && activeConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
        `}
        onClick={handleSelectConversation}
      >
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 h-full
        ${!mobileChatOpen || !activeConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
      `}>
        {activeConversation ? (
          <>
            {/* Mobile back button */}
            <div className="md:hidden absolute top-3 left-3 z-10">
              <button
                onClick={() => setMobileChatOpen(false)}
                className="text-xs bg-background border rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </div>
            <ErrorBoundary>
              <ChatWindow conversation={activeConversation} />
            </ErrorBoundary>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
