import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { EmptyState } from './EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useChatStore } from '@/store/useChatStore'


export function AppLayout() {
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Open chat view on mobile when a conversation is selected
  useEffect(() => {
    if (activeConversationId) {
      setMobileChatOpen(true)
    }
  }, [activeConversationId])

  const handleBack = useCallback(() => {
    setMobileChatOpen(false)
    setActiveConversation(null)
  }, [setActiveConversation])

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 h-full
          ${mobileChatOpen && activeConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
        `}
      >
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 h-full
        ${!mobileChatOpen || !activeConversation ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
      `}>
        {activeConversation ? (
          <ErrorBoundary>
            <ChatWindow conversation={activeConversation} onBack={handleBack} />
          </ErrorBoundary>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}
