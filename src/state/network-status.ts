/**
 * Адаптер над offline-инфраструктурой приложения.
 *
 * Переэкспортирует типы и helper-функции сети из общего пакета,
 * чтобы остальной код зависел от локального модуля, а не от внешнего пути.
 */
export {
  getNetworkStatus,
  isNetworkUnavailableError,
  markConnectionAvailable,
  markConnectionUnavailable,
  subscribeToNetworkStatus,
  trackedFetch,
  type NetworkStatus,
} from "@aris/offline";
