import { useCallback, useState } from 'react'
import type { FeedItem } from '../../hooks/useChat'
import type { ChatService } from '../../services/ChatService'
import type { ConnectionStatus, Member, SendResult } from '../../types'
import { ConnectionBanner } from '../ConnectionBanner/ConnectionBanner'
import { ImageViewer } from '../ImageViewer/ImageViewer'
import { PixelHeart } from '../Icons'
import { MemberList } from '../MemberList/MemberList'
import { MessageInput } from '../MessageInput/MessageInput'
import { MessageList } from '../MessageList/MessageList'
import { TypingIndicator } from '../TypingIndicator/TypingIndicator'

interface Props {
  service: ChatService
  nickname: string
  status: ConnectionStatus
  feed: FeedItem[]
  members: Member[]
  typing: string[]
  onSend: (input: { body: string; image?: File | null }) => Promise<SendResult>
  onTyping: (isTyping: boolean) => void
  onLeave: () => void
  /** ?debug=1 時才顯示「模擬斷線」按鈕 */
  debugMode: boolean
}

export function ChatRoom({ service, nickname, status, feed, members, typing, onSend, onTyping, onLeave, debugMode }: Props) {
  const [membersOpen, setMembersOpen] = useState(false)
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)
  const closeViewer = useCallback(() => setViewerSrc(null), [])

  const online = status === 'online'
  const debug = debugMode ? service.debug : undefined

  return (
    <div className="room">
      <header className="box pk hdr">
        <div className="ttl">
          <PixelHeart />
          <span>像素聊天室</span>
          <span className="ttl-sub">★ 歡迎來到冒險者大廳</span>
        </div>
        {debug && (
          <button className="btn plain sm" type="button" onClick={() => debug.setOffline(!debug.isOffline())}>
            {online ? '模擬斷線' : '恢復連線'}
          </button>
        )}
        <button
          className="btn sub sm online-toggle"
          type="button"
          aria-expanded={membersOpen}
          aria-controls="member-panel"
          onClick={() => setMembersOpen((open) => !open)}
        >
          {members.length} 人在線 {membersOpen ? '▲' : '▼'}
        </button>
        <button className="btn plain sm" type="button" onClick={onLeave}>離開</button>
      </header>

      {!online && <ConnectionBanner />}

      <div className="room-body">
        <div className="room-main">
          {membersOpen && <MemberList id="member-panel" variant="panel" members={members} myNickname={nickname} />}
          <MessageList feed={feed} myNickname={nickname} imageUrl={service.imageUrl.bind(service)} onOpenImage={setViewerSrc} />
          <TypingIndicator names={typing} />
          <MessageInput disabled={!online} onSend={onSend} onTyping={onTyping} />
        </div>
        <MemberList variant="side" members={members} myNickname={nickname} />
      </div>

      {viewerSrc && <ImageViewer src={viewerSrc} onClose={closeViewer} />}
    </div>
  )
}
