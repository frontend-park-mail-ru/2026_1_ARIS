export type GamesPollingRuntime = {
  sync: () => void;
  stop: () => void;
};

export type CreateGamesPollingRuntimeOptions = {
  intervalMs: number;
  shouldRun: () => boolean;
  onTick: () => void;
};

/** Создаёт управляемый polling-runtime с одним активным interval. */
export function createGamesPollingRuntime(
  options: CreateGamesPollingRuntimeOptions,
): GamesPollingRuntime {
  let timerId: number | null = null;

  const stop = () => {
    if (timerId === null) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  return {
    sync() {
      stop();
      if (!options.shouldRun()) return;
      timerId = window.setInterval(() => {
        if (!options.shouldRun()) {
          stop();
          return;
        }
        options.onTick();
      }, options.intervalMs);
    },
    stop,
  };
}
