/**
 * Модуль слоя API.
 *
 * Содержит клиентские запросы и нормализацию данных для интерфейса.
 */
export const API_BASE_URL: string =
  window.location.hostname === "localhost" ? "http://localhost:8080" : "";
