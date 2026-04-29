/**
 * Простой in-memory кэш с TTL.
 *
 * Подходит для короткоживущих данных интерфейса, где не нужна сложная стратегия
 * вытеснения, а достаточно автоматически протухающих записей.
 */
type CacheEntry<V> = { value: V; expiresAt: number };

export class TtlCache<K, V> {
  private map = new Map<K, CacheEntry<V>>();

  /**
   * @param {number} ttlMs Время жизни записи в миллисекундах.
   */
  constructor(private readonly ttlMs: number) {}

  /**
   * Возвращает значение из кэша, если срок жизни ещё не истёк.
   *
   * @param {K} key Ключ кэша.
   * @returns {V | undefined} Значение или `undefined`.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Сохраняет значение в кэш.
   *
   * @param {K} key Ключ кэша.
   * @param {V} value Сохраняемое значение.
   * @returns {void}
   */
  set(key: K, value: V): void {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Удаляет запись из кэша.
   *
   * @param {K} key Ключ кэша.
   * @returns {void}
   */
  delete(key: K): void {
    this.map.delete(key);
  }

  /**
   * Очищает весь кэш.
   *
   * @returns {void}
   */
  clear(): void {
    this.map.clear();
  }
}
