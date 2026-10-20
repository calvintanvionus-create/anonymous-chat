/** 很小的事件發送器：服務用它把事件交給畫面 */
export class Emitter<E extends object> {
  private handlers: { [K in keyof E]?: Set<(payload: E[K]) => void> } = {}

  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void {
    const set = (this.handlers[event] ??= new Set())
    set.add(handler)
    return () => {
      set.delete(handler)
    }
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.handlers[event]?.forEach((handler) => handler(payload))
  }
}
