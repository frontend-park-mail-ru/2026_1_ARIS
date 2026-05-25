import { updateGamesCountdown } from "../shared/timers";

export type GamesCountdownRuntime = {
  start: (root: Document | HTMLElement) => void;
  stop: () => void;
};

export type CreateGamesCountdownRuntimeOptions = {
  getRoot: () => Document | HTMLElement | null;
  formatScore: (value: number) => string;
  onFinalResultsExpired: () => void;
};

/** Проверяет, есть ли в root элементы, которым нужен игровой countdown. */
function hasCountdownElements(root: Document | HTMLElement): boolean {
  return Boolean(
    root.querySelector(
      "[data-games-countdown], [data-games-timer-deadline], [data-games-final-results-until]",
    ),
  );
}

/** Создаёт runtime-обвязку для запуска и остановки игровых countdown-таймеров. */
export function createGamesCountdownRuntime(
  options: CreateGamesCountdownRuntimeOptions,
): GamesCountdownRuntime {
  let timerId: number | null = null;

  const update = (root: Document | HTMLElement) => {
    updateGamesCountdown(root, {
      formatScore: options.formatScore,
      onFinalResultsExpired: options.onFinalResultsExpired,
    });
  };

  const stop = () => {
    if (timerId === null) return;
    window.clearInterval(timerId);
    timerId = null;
  };

  return {
    start(root) {
      stop();
      update(root);
      if (!hasCountdownElements(root)) return;

      timerId = window.setInterval(() => {
        const currentRoot = options.getRoot();
        if (!currentRoot) return;
        update(currentRoot);
      }, 10);
    },
    stop,
  };
}
