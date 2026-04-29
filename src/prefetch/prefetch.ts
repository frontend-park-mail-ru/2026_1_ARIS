/**
 * Инфраструктура предзагрузки маршрутов.
 *
 * Управляет регистрацией и запуском предзагрузки данных по маршрутам.
 */
type PrefetchLoader = () => Promise<void>;

const registry = new Map<string, PrefetchLoader>();
const inFlight = new Set<string>();

export function registerPrefetch(path: string, loader: PrefetchLoader): void {
  registry.set(path, loader);
}

/**
 * Запускает предзагрузку данных для маршрута без ожидания результата.
 * Если загрузка уже идёт или данные в кэше — лоадер вернётся мгновенно.
 */
export function prefetchRoute(path: string): void {
  const normalised = path.replace(/\/+$/g, "") || "/";
  if (inFlight.has(normalised)) return;
  const loader = registry.get(normalised);
  if (!loader) return;
  inFlight.add(normalised);
  void loader().finally(() => inFlight.delete(normalised));
}
