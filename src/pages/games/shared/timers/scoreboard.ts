import { scoreValueAnimationMs } from "../constants";

/**
 * Считает easing для плавного добора счёта.
 */
function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/**
 * Анимирует числовое значение счёта игрока.
 */
function animateScoreValue(
  element: HTMLElement,
  from: number,
  to: number,
  formatScore: (value: number) => string,
): void {
  const startedAt = performance.now();
  element.dataset.gamesScoreAnimated = "true";

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / scoreValueAnimationMs);
    const value = from + (to - from) * easeOutCubic(progress);
    element.textContent = formatScore(progress >= 1 ? to : value);
    if (progress < 1) {
      window.requestAnimationFrame(tick);
      return;
    }
    element.classList.add("games-game-player__score-value--bump");
  };

  window.requestAnimationFrame(tick);
}

/**
 * Синхронизирует отложенные анимации очков и финальной сортировки scoreboard.
 */
export function syncScoreboardAnimations(
  root: Document | HTMLElement,
  formatScore: (value: number) => string,
): void {
  const now = Date.now();

  root.querySelectorAll<HTMLElement>("[data-games-score-shell]").forEach((scoreShell) => {
    const showAt = Number(scoreShell.dataset.gamesScoreShowAt ?? 0);
    if (!Number.isFinite(showAt) || now < showAt) return;
    scoreShell.classList.add("games-game-player__score--showing-round-points");
  });

  root.querySelectorAll<HTMLElement>("[data-games-round-points-badge]").forEach((badge) => {
    const startAt = Number(badge.dataset.gamesRoundPointsStartAt ?? 0);
    if (!Number.isFinite(startAt) || now < startAt) return;
    badge.classList.add("games-game-player__round-points--visible");
  });

  root.querySelectorAll<HTMLElement>("[data-games-score-animate]").forEach((score) => {
    if (score.dataset.gamesScoreAnimated === "true") return;
    const startAt = Number(score.dataset.gamesScoreStartAt ?? 0);
    if (!Number.isFinite(startAt) || now < startAt) return;
    const from = Number(score.dataset.gamesScoreFrom ?? 0);
    const to = Number(score.dataset.gamesScoreTo ?? from);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      score.textContent = formatScore(Number.isFinite(to) ? to : from);
      score.dataset.gamesScoreAnimated = "true";
      return;
    }
    animateScoreValue(score, from, to, formatScore);
  });

  root.querySelectorAll<HTMLElement>("[data-games-scoreboard-list]").forEach((list) => {
    if (list.dataset.gamesScoreboardSorted === "true") return;
    const sortAt = Number(list.dataset.gamesScoreboardSortAt ?? 0);
    if (!Number.isFinite(sortAt) || now < sortAt) return;

    const order = (list.dataset.gamesScoreboardFinalOrder ?? "")
      .split(",")
      .map((profileId) => profileId.trim())
      .filter(Boolean);
    if (!order.length) return;

    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-games-scoreboard-card]"));
    const rects = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));
    const byProfile = new Map(cards.map((card) => [card.dataset.gamesScoreboardCard ?? "", card]));
    order.forEach((profileId) => {
      const card = byProfile.get(profileId);
      if (card) list.append(card);
    });
    cards.forEach((card) => {
      const place = card.dataset.gamesPlayerFinalPlace;
      const placeEl = card.querySelector<HTMLElement>(".games-game-player__place");
      if (place && placeEl) placeEl.textContent = `#${place}`;
      card.classList.toggle("games-game-player--leader", place === "1");
    });
    cards.forEach((card) => {
      const previous = rects.get(card);
      if (!previous) return;
      const next = card.getBoundingClientRect();
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaY) < 1) return;
      card.classList.add("games-game-player--sorting");
      card.style.transform = `translateY(${deltaY}px)`;
      card.style.transition = "transform 0s";
      window.requestAnimationFrame(() => {
        card.style.transition = "";
        card.style.transform = "";
      });
    });
    list.dataset.gamesScoreboardSorted = "true";
  });
}
