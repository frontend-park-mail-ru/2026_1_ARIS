/**
 * Универсальный реактивный менеджер состояния.
 *
 * Хранит типизированный объект состояния и уведомляет подписчиков при каждом изменении.
 * Все чтения возвращают замороженную поверхностную копию, чтобы внешний код не мог менять внутреннее состояние.
 *
 * @example
 * const store = new StateManager({ count: 0, name: "" });
 * const unsubscribe = store.subscribe((s) => console.log(s.count));
 * store.patch({ count: 1 }); // вызывает подписчиков
 * unsubscribe();
 */
export class StateManager<T extends object> {
  private state: T;
  private readonly listeners = new Set<(state: Readonly<T>) => void>();

  constructor(initial: T) {
    this.state = { ...initial };
  }

  /** Возвращает замороженный поверхностный снимок текущего состояния. */
  get(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  /** Полностью заменяет состояние и уведомляет всех подписчиков. */
  set(next: T): void {
    this.state = { ...next };
    this.notify();
  }

  /** Объединяет частичное обновление с текущим состоянием и уведомляет всех подписчиков. */
  patch(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Подписывает на изменения состояния.
   * Слушатель вызывается с замороженным снимком после каждого `set` или `patch`.
   * @returns Функцию отписки.
   */
  subscribe(listener: (state: Readonly<T>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Сбрасывает состояние к новому начальному значению и уведомляет всех подписчиков. */
  reset(initial: T): void {
    this.state = { ...initial };
    this.notify();
  }

  private notify(): void {
    const snapshot = this.get();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
