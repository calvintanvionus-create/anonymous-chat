import type { ChatEvents, ConnectionStatus, JoinResult, Member, Message, SendResult } from '../types'
import { ALLOWED_IMAGE_TYPES, LIMITS, countChars, validateNickname } from '../lib/validate'
import type { ChatService } from './ChatService'
import { Emitter } from './emitter'

/**
 * 階段一用的假服務：不連任何伺服器，但說的話和真服務一模一樣。
 *
 * - 訊息存在這個瀏覽器的 localStorage，開兩個分頁可以互相聊天（BroadcastChannel 同步）
 * - 有幾位「機器人」會隨機進出、打字、說話，讓畫面看起來有人
 * - 機器人的訊息只在各自的分頁出現，不會存起來
 */

const CHANNEL_NAME = 'anonymous-chat-mock-v1'
const STORE_KEY = 'anonymous-chat-mock:messages'
const HEARTBEAT_MS = 5000
const STALE_MS = 15000

const BOT_NAMES = ['小華', '小明', '大白', '栗子', '小美', '阿福']
const BOT_LINES = [
  '早安～',
  '有人要一起去看櫻花嗎？',
  '今天好冷喔',
  '哈哈哈哈哈',
  '晚餐吃什麼好？',
  '我剛剛看到一隻貓！',
  '好期待週末',
  '＋1',
  '真的假的！',
  '這首歌好好聽 ♪',
  '剛下班，累死了',
  '大家加油～',
  '我也想去！',
  '笑死',
  '晚安～明天見',
  '有人在嗎？',
]

const SAKURA_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 15" shape-rendering="crispEdges">' +
  '<rect width="22" height="15" fill="#BFE6F5"/><rect y="11" width="22" height="4" fill="#9ED9A8"/>' +
  '<rect x="10" y="7" width="2" height="5" fill="#8A5A44"/>' +
  '<path d="M6 2h10v2h2v3h-2v1h-10v-1h-2v-3h2z" fill="#FFB3C7"/>' +
  '<path d="M8 3h2v1h-2z M13 5h2v1h-2z M7 6h2v1h-2z" fill="#FF8CAD"/>' +
  '<rect x="2" y="2" width="3" height="1" fill="#fff"/><rect x="3" y="3" width="3" height="1" fill="#fff"/></svg>'
const SAKURA_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SAKURA_SVG)}`

type Wire =
  | { t: 'who'; tab: string }
  | { t: 'hello'; tab: string; nickname: string; joinedAt: string }
  | { t: 'bye'; tab: string }
  | { t: 'msg'; message: Message }
  | { t: 'typing'; tab: string; nickname: string; isTyping: boolean }

interface RemoteTab {
  nickname: string
  joinedAt: string
  lastSeen: number
}

let seq = 0
const newId = () => Date.now() * 1000 + (seq++ % 1000)
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function readStored(): Message[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Message[]) : []
  } catch {
    return []
  }
}

function writeStored(messages: Message[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-LIMITS.retainCount)))
  } catch {
    // 空間不足或被瀏覽器封鎖時，就只存在記憶體裡，不影響聊天
  }
}

/** 第一次進來時，產生 50 則假的歷史訊息：一批是昨晚、一批是剛剛 */
function makeSeed(): Message[] {
  const messages: Message[] = []
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(20, 0, 0, 0)
  let t = yesterday.getTime()
  for (let i = 0; i < 30; i++) {
    t += rand(2, 7) * 60_000
    messages.push({ id: newId(), nickname: pick(BOT_NAMES), body: pick(BOT_LINES), imagePath: null, createdAt: new Date(t).toISOString() })
  }
  let recent = Date.now() - 3 * 60_000
  const tail: Message[] = []
  for (let i = 0; i < 20; i++) {
    const isPhoto = i === 3
    tail.unshift({
      id: newId(),
      nickname: pick(BOT_NAMES),
      body: isPhoto ? '這是昨天拍的，全部都開了！' : pick(BOT_LINES),
      imagePath: isPhoto ? SAKURA_DATA_URL : null,
      createdAt: new Date(recent).toISOString(),
    })
    recent -= rand(1, 4) * 60_000
  }
  // tail 是由新到舊塞進去的，這裡已經用 unshift 排成由舊到新；ID 重新依順序編號
  tail.forEach((m, i) => (m.id = messages[messages.length - 1].id + (i + 1) * 1000))
  return [...messages, ...tail]
}

function loadHistory(): Message[] {
  let stored = readStored()
  if (stored.length === 0) {
    stored = makeSeed()
    writeStored(stored)
  }
  return stored
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export class MockChatService implements ChatService {
  private bus = new Emitter<ChatEvents>()
  private tabId = Math.random().toString(36).slice(2)
  private channel: BroadcastChannel | null = null

  private me: Member | null = null
  private remote = new Map<string, RemoteTab>()
  private bots = new Map<string, Member>()

  private offline = false
  private queue: Array<() => void> = []
  private timers = new Set<number>()
  private intervals = new Set<number>()
  private lastSentAt = 0

  private typingTimers = new Map<string, number>()
  private typingOrder: string[] = []

  readonly debug = {
    isOffline: () => this.offline,
    setOffline: (offline: boolean) => this.setOffline(offline),
  }

  on<K extends keyof ChatEvents>(event: K, handler: (payload: ChatEvents[K]) => void): () => void {
    return this.bus.on(event, handler)
  }

  imageUrl(path: string): string {
    return path
  }

  // ───────────── 進入 ─────────────

  async join(raw: string): Promise<JoinResult> {
    const check = validateNickname(raw)
    if (!check.ok) return { ok: false, reason: 'nickname_invalid' }
    const nickname = check.value

    this.emitStatus('connecting')
    this.openChannel()
    this.post({ t: 'who', tab: this.tabId })
    await sleep(350) // 等其他分頁回報「我在線上」

    if (this.isTaken(nickname)) {
      this.closeChannel()
      this.emitStatus('offline')
      return { ok: false, reason: 'nickname_taken' }
    }

    this.me = { nickname, joinedAt: new Date().toISOString() }
    this.offline = false
    window.addEventListener('pagehide', this.onPageHide)
    this.post(this.hello())
    this.every(() => {
      this.post(this.hello())
      this.sweepStale()
    }, HEARTBEAT_MS)
    this.startBots()

    this.emitStatus('online')
    this.bus.emit('history:loaded', loadHistory().slice(-LIMITS.historyCount))
    this.syncPresence()
    return { ok: true }
  }

  // ───────────── 送訊息 ─────────────

  async sendMessage(input: { body: string; image?: File | null }): Promise<SendResult> {
    if (!this.me) return { ok: false, reason: 'not_joined' }
    if (this.offline) return { ok: false, reason: 'offline' }

    const body = input.body.trim()
    const image = input.image ?? null
    if (!body && !image) return { ok: false, reason: 'empty' }
    if (countChars(body) > LIMITS.messageMax) return { ok: false, reason: 'too_long' }
    if (image) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(image.type)) return { ok: false, reason: 'image_type' }
      if (image.size > LIMITS.imageMaxBytes) return { ok: false, reason: 'image_too_large' }
    }

    const now = Date.now()
    if (now - this.lastSentAt < LIMITS.rateLimitMs) return { ok: false, reason: 'rate_limited' }
    this.lastSentAt = now

    let imagePath: string | null = null
    if (image) {
      try {
        imagePath = await readAsDataUrl(image)
      } catch {
        return { ok: false, reason: 'failed' }
      }
    }

    const message: Message = {
      id: newId(),
      nickname: this.me.nickname,
      body,
      imagePath,
      createdAt: new Date().toISOString(),
    }

    // 太大的圖片不放進 localStorage（容易爆容量），重新整理後只留文字
    const persisted: Message =
      imagePath && imagePath.length > 200_000
        ? { ...message, imagePath: null, body: body || '（圖片只在送出的那一刻顯示）' }
        : message
    writeStored([...readStored(), persisted])

    this.post({ t: 'msg', message })
    this.post({ t: 'typing', tab: this.tabId, nickname: message.nickname, isTyping: false })
    this.later(() => this.deliver(() => this.bus.emit('message:new', message)), 60)

    if (this.bots.size > 0 && Math.random() < 0.6) {
      this.later(() => this.botSay(), rand(1500, 3000))
    }
    return { ok: true }
  }

  setTyping(isTyping: boolean): void {
    if (!this.me) return
    this.post({ t: 'typing', tab: this.tabId, nickname: this.me.nickname, isTyping })
  }

  // ───────────── 離開 ─────────────

  leave(): void {
    if (this.me) this.post({ t: 'bye', tab: this.tabId })
    this.teardown()
    this.emitStatus('offline')
    this.bus.emit('presence:sync', [])
    this.bus.emit('typing:update', [])
  }

  private teardown(): void {
    window.removeEventListener('pagehide', this.onPageHide)
    this.timers.forEach((id) => window.clearTimeout(id))
    this.intervals.forEach((id) => window.clearInterval(id))
    this.typingTimers.forEach((id) => window.clearTimeout(id))
    this.timers.clear()
    this.intervals.clear()
    this.typingTimers.clear()
    this.typingOrder = []
    this.queue = []
    this.bots.clear()
    this.remote.clear()
    this.me = null
    this.offline = false
    this.closeChannel()
  }

  private onPageHide = () => {
    if (this.me) this.post({ t: 'bye', tab: this.tabId })
  }

  // ───────────── 斷線測試 ─────────────

  private setOffline(offline: boolean): void {
    if (!this.me) return
    if (offline) {
      if (this.offline) return
      this.offline = true
      this.emitStatus('reconnecting')
      return
    }
    if (!this.offline) return
    this.emitStatus('reconnecting')
    this.later(() => {
      this.offline = false
      const pending = this.queue
      this.queue = []
      pending.forEach((run) => run()) // 補上斷線期間漏掉的事件
      this.syncPresence()
      this.bus.emit('typing:update', [...this.typingOrder])
      this.emitStatus('online')
    }, 1200)
  }

  /** 斷線時，事件先排隊，連回來再一次送出 */
  private deliver(run: () => void): void {
    if (this.offline) this.queue.push(run)
    else run()
  }

  // ───────────── 多分頁同步 ─────────────

  private openChannel(): void {
    if (this.channel || typeof BroadcastChannel === 'undefined') return
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.onmessage = (event: MessageEvent<Wire>) => this.onWire(event.data)
  }

  private closeChannel(): void {
    this.channel?.close()
    this.channel = null
    this.remote.clear()
  }

  private post(wire: Wire): void {
    this.channel?.postMessage(wire)
  }

  private hello(): Wire {
    return { t: 'hello', tab: this.tabId, nickname: this.me?.nickname ?? '', joinedAt: this.me?.joinedAt ?? '' }
  }

  private onWire(wire: Wire): void {
    switch (wire.t) {
      case 'who':
        if (this.me) this.post(this.hello())
        break
      case 'hello': {
        if (!wire.nickname) break
        const known = this.remote.has(wire.tab)
        this.remote.set(wire.tab, { nickname: wire.nickname, joinedAt: wire.joinedAt, lastSeen: Date.now() })
        if (!known && this.me) {
          this.deliver(() => {
            this.bus.emit('presence:join', { nickname: wire.nickname, joinedAt: wire.joinedAt })
            this.syncPresence()
          })
        }
        break
      }
      case 'bye':
        this.dropRemote(wire.tab)
        break
      case 'msg':
        if (!this.me) break
        this.setRemoteTyping(wire.message.nickname, false)
        this.deliver(() => this.bus.emit('message:new', wire.message))
        break
      case 'typing':
        if (this.me) this.setRemoteTyping(wire.nickname, wire.isTyping)
        break
    }
  }

  private dropRemote(tab: string): void {
    const gone = this.remote.get(tab)
    if (!gone) return
    this.remote.delete(tab)
    this.setRemoteTyping(gone.nickname, false)
    if (!this.me) return
    this.deliver(() => {
      this.bus.emit('presence:leave', { nickname: gone.nickname, joinedAt: gone.joinedAt })
      this.syncPresence()
    })
  }

  /** 分頁直接被關掉、沒來得及說再見時，靠心跳逾時判斷離開 */
  private sweepStale(): void {
    const limit = Date.now() - STALE_MS
    for (const [tab, info] of this.remote) {
      if (info.lastSeen < limit) this.dropRemote(tab)
    }
  }

  // ───────────── 在線名單與代號 ─────────────

  private isTaken(nickname: string): boolean {
    const wanted = nickname.toLowerCase()
    for (const bot of this.bots.values()) if (bot.nickname.toLowerCase() === wanted) return true
    for (const tab of this.remote.values()) if (tab.nickname.toLowerCase() === wanted) return true
    // 還沒進來之前機器人還沒啟動，所以另外比對名單
    return BOT_NAMES.some((name) => name.toLowerCase() === wanted)
  }

  private members(): Member[] {
    const others = [...this.remote.values(), ...this.bots.values()]
      .map(({ nickname, joinedAt }) => ({ nickname, joinedAt }))
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    return this.me ? [this.me, ...others] : others
  }

  private syncPresence(): void {
    this.bus.emit('presence:sync', this.members())
  }

  // ───────────── 正在輸入 ─────────────

  private setRemoteTyping(nickname: string, isTyping: boolean): void {
    const timer = this.typingTimers.get(nickname)
    if (timer !== undefined) window.clearTimeout(timer)
    this.typingTimers.delete(nickname)

    if (isTyping) {
      if (!this.typingOrder.includes(nickname)) this.typingOrder.push(nickname)
      // 對方沒再通知就自動消失（接收端負責，因為對方可能直接斷線）
      this.typingTimers.set(
        nickname,
        window.setTimeout(() => this.setRemoteTyping(nickname, false), LIMITS.typingIdleMs + 500),
      )
    } else {
      this.typingOrder = this.typingOrder.filter((name) => name !== nickname)
    }
    if (!this.offline) this.bus.emit('typing:update', [...this.typingOrder])
  }

  // ───────────── 機器人 ─────────────

  private startBots(): void {
    const taken = new Set([...this.remote.values()].map((r) => r.nickname.toLowerCase()))
    const mine = this.me?.nickname.toLowerCase()
    const pool = BOT_NAMES.filter((name) => !taken.has(name.toLowerCase()) && name.toLowerCase() !== mine)
    pool.sort(() => Math.random() - 0.5)
    pool.slice(0, 3).forEach((name) => this.bots.set(name, { nickname: name, joinedAt: new Date().toISOString() }))
    this.scheduleBotChurn()
    this.scheduleBotChat()
  }

  private availableBotNames(): string[] {
    const taken = new Set([...this.remote.values()].map((r) => r.nickname.toLowerCase()))
    const mine = this.me?.nickname.toLowerCase()
    return BOT_NAMES.filter(
      (name) => !this.bots.has(name) && !taken.has(name.toLowerCase()) && name.toLowerCase() !== mine,
    )
  }

  private scheduleBotChurn(): void {
    this.later(() => {
      const away = this.availableBotNames()
      const shouldLeave = this.bots.size >= 5 || (this.bots.size > 2 && Math.random() < 0.5) || away.length === 0
      if (shouldLeave && this.bots.size > 0) {
        const name = pick([...this.bots.keys()])
        const bot = this.bots.get(name)!
        this.bots.delete(name)
        this.setRemoteTyping(name, false)
        this.deliver(() => {
          this.bus.emit('presence:leave', bot)
          this.syncPresence()
        })
      } else if (away.length > 0) {
        const name = pick(away)
        const bot = { nickname: name, joinedAt: new Date().toISOString() }
        this.bots.set(name, bot)
        this.deliver(() => {
          this.bus.emit('presence:join', bot)
          this.syncPresence()
        })
      }
      this.scheduleBotChurn()
    }, rand(9000, 20000))
  }

  private scheduleBotChat(): void {
    this.later(() => {
      this.botSay()
      this.scheduleBotChat()
    }, rand(14000, 32000))
  }

  private botSay(): void {
    if (this.bots.size === 0) return
    const name = pick([...this.bots.keys()])
    this.setRemoteTyping(name, true)
    this.later(() => {
      this.setRemoteTyping(name, false)
      if (!this.bots.has(name)) return
      const message: Message = {
        id: newId(),
        nickname: name,
        body: pick(BOT_LINES),
        imagePath: null,
        createdAt: new Date().toISOString(),
      }
      this.deliver(() => this.bus.emit('message:new', message))
    }, rand(1500, 3000))
  }

  // ───────────── 小工具 ─────────────

  private emitStatus(status: ConnectionStatus): void {
    this.bus.emit('connection:status', status)
  }

  private later(run: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id)
      run()
    }, ms)
    this.timers.add(id)
  }

  private every(run: () => void, ms: number): void {
    this.intervals.add(window.setInterval(run, ms))
  }
}
