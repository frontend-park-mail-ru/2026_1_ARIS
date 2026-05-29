import { formatTimerRemainingMs, getTimerRemainingCentiseconds } from "./formatting";
import { syncScoreboardAnimations } from "./scoreboard";

/**
 * Обновляет игровые countdown-элементы внутри root.
 */
export function updateGamesCountdown(
  root: Document | HTMLElement,
  options: {
    formatScore: (value: number) => string;
    onFinalResultsExpired: () => void;
    onRoundResultExpired?: () => void;
  },
): void {
  syncScoreboardAnimations(root, options.formatScore);
  const preciseTimers = root.querySelectorAll<HTMLElement>("[data-games-timer-deadline]");
  preciseTimers.forEach((timer) => {
    const valueEl = timer.querySelector<HTMLElement>("[data-games-timer-value]");
    const progressEl = timer.querySelector<HTMLElement>("[data-games-timer-progress]");
    const deadline = new Date(timer.dataset.gamesTimerDeadline ?? "");
    const startedAt = new Date(timer.dataset.gamesTimerStart ?? "");
    const totalFromDataset = Number(timer.dataset.gamesTimerTotalMs ?? 0);
    const deadlineMs = deadline.getTime();
    const startedMs = startedAt.getTime();

    if (Number.isNaN(deadlineMs)) {
      if (valueEl) valueEl.textContent = "--";
      if (progressEl) progressEl.style.transform = "scaleX(0)";
      return;
    }

    const delayUntilMs = Number(timer.dataset.gamesTimerDelayUntil ?? 0);
    if (Number.isFinite(delayUntilMs) && delayUntilMs > 0 && Date.now() < delayUntilMs) {
      timer.classList.add("games-precision-timer--pending");
      if (valueEl) valueEl.textContent = "--";
      if (progressEl) progressEl.style.transform = "scaleX(0)";
      return;
    }
    timer.classList.remove("games-precision-timer--pending");

    const remainingMs = Math.max(0, deadlineMs - Date.now());
    const remainingCentiseconds = getTimerRemainingCentiseconds(remainingMs);
    const totalMs =
      Number.isFinite(totalFromDataset) && totalFromDataset > 0
        ? totalFromDataset
        : Number.isNaN(startedMs)
          ? Math.max(remainingMs, 1)
          : Math.max(deadlineMs - startedMs, 1);
    const progress = Math.max(0, Math.min(1, (remainingCentiseconds * 10) / totalMs));
    const isDanger = remainingMs <= 3000;

    if (valueEl) valueEl.textContent = formatTimerRemainingMs(remainingMs);
    if (progressEl) progressEl.style.transform = `scaleX(${progress})`;
    timer.classList.toggle("games-precision-timer--danger", isDanger);
    timer.classList.toggle("games-start-countdown--danger", isDanger);
  });

  const finalResultsUntilEl = root.querySelector<HTMLElement>("[data-games-final-results-until]");
  if (finalResultsUntilEl) {
    const finalResultsUntilMs = new Date(
      finalResultsUntilEl.dataset.gamesFinalResultsUntil ?? "",
    ).getTime();
    if (!Number.isNaN(finalResultsUntilMs) && Date.now() >= finalResultsUntilMs) {
      finalResultsUntilEl.removeAttribute("data-games-final-results-until");
      window.setTimeout(() => options.onFinalResultsExpired(), 0);
    }
  }

  const roundResultUntilEl = root.querySelector<HTMLElement>("[data-games-round-result-until]");
  if (roundResultUntilEl) {
    const roundResultUntilMs = new Date(
      roundResultUntilEl.dataset.gamesRoundResultUntil ?? "",
    ).getTime();
    if (!Number.isNaN(roundResultUntilMs) && Date.now() >= roundResultUntilMs) {
      roundResultUntilEl.removeAttribute("data-games-round-result-until");
      window.setTimeout(() => options.onRoundResultExpired?.(), 0);
    }
  }

  const countdownEl = root.querySelector<HTMLElement>("[data-games-countdown]");
  const questionEl = root.querySelector<HTMLElement>("[data-games-deadline]");
  if (!countdownEl || !questionEl) return;

  const deadline = new Date(questionEl.dataset.gamesDeadline ?? "");
  const diffMs = deadline.getTime() - Date.now();

  if (Number.isNaN(deadline.getTime())) {
    countdownEl.textContent = "--:--";
    return;
  }

  const totalSeconds = Math.max(0, Math.ceil(diffMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  countdownEl.classList.toggle("games-countdown--danger", totalSeconds <= 3);
}
