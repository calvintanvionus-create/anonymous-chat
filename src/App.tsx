import { useState } from 'react'
import { ChatRoom } from './components/ChatRoom/ChatRoom'
import { JoinPage } from './components/JoinPage/JoinPage'
import { useChat } from './hooks/useChat'
import { useSystemNight } from './hooks/useSystemTheme'
import { createChatService } from './services/createChatService'

const debugMode = new URLSearchParams(window.location.search).has('debug')

/** 決定顯示進入頁或聊天室。換後端只會動到 createChatService。 */
export default function App() {
  const [service] = useState(createChatService)
  const night = useSystemNight()
  const chat = useChat(service)

  return (
    <div className={`app${night ? ' night' : ''}`}>
      {chat.phase === 'join' ? (
        <JoinPage onJoin={chat.join} />
      ) : (
        <ChatRoom
          service={service}
          nickname={chat.nickname}
          status={chat.status}
          feed={chat.feed}
          members={chat.members}
          typing={chat.typing}
          onSend={chat.send}
          onTyping={chat.notifyTyping}
          onLeave={chat.leave}
          debugMode={debugMode}
        />
      )}
    </div>
  )
}
