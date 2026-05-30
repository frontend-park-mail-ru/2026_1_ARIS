import { escapeHtml } from "../../../../utils/avatar";
import {
  getLatestCompletedQuestion,
  getPauseVotePercent,
  getQuestionPositionLabel,
} from "../../round/model";
import { gameT } from "../../shared/i18n";
import { getPlayerFullName, getPlayerFullNameByProfile } from "../../room/profile/players";
import type { RenderPauseActionOptions, RenderPauseStageOptions } from "./types";

const DEFAULT_PAUSE_COUNTDOWN_MS = 120_000;
const FORCE_RESUME_COUNTDOWN_WINDOW_MS = 5_500;

/** Возвращает длительность паузного countdown с учётом короткого force-resume окна. */
function getPauseCountdownTotalMs(deadlineAt: string): number {
  const deadlineMs = new Date(deadlineAt).getTime();
  if (Number.isNaN(deadlineMs)) return DEFAULT_PAUSE_COUNTDOWN_MS;

  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0 || remainingMs > FORCE_RESUME_COUNTDOWN_WINDOW_MS) {
    return DEFAULT_PAUSE_COUNTDOWN_MS;
  }

  return Math.max(1_000, Math.ceil(remainingMs / 1_000) * 1_000);
}

/**
 * Рендерит действие паузы для компактного заголовка активной игры.
 */
export function renderPauseAction(options: RenderPauseActionOptions): string {
  const { room, loading, canPause, currentPlayer, isStartCountdown } = options;
  if (room.isPublicLobby) {
    return "";
  }

  if (isStartCountdown) {
    return "";
  }

  if (canPause) {
    return `
      <button type="button" class="games-button games-button--secondary games-play-header__action" data-games-pause-room ${loading ? "disabled" : ""}>
        ${escapeHtml(gameT("gameplay.pauseButton"))}
      </button>
    `;
  }

  if (room.status === "active" && !room.pauseUntilAt && currentPlayer?.pauseUsed) {
    return `<span class="games-play-header__note">${escapeHtml(gameT("gameplay.pauseUsed"))}</span>`;
  }

  return "";
}

/**
 * Рендерит экран паузы, таймер продолжения и голоса за принудительное снятие паузы.
 */
export function renderPauseStage(options: RenderPauseStageOptions): string {
  const { room, loading, pausedByPlayer, canForceResume, currentPlayer } = options;
  const votesLabel = gameT("gameplay.forceVotes", {
    current: room.pauseForceVotes,
    required: room.pauseForceVotesRequired,
  });
  const pausedQuestion = room.currentQuestion ?? getLatestCompletedQuestion(room);
  const votePercent = getPauseVotePercent(room);
  const votePlayers = room.players.filter((player) => player.profileId !== room.pausedByProfileId);
  const pauseCountdownTotalMs = getPauseCountdownTotalMs(room.pauseUntilAt);

  return `
    <section class="games-game-stage games-game-stage--pause" data-key="stage-pause-${escapeHtml(room.pauseStartedAt || room.pausedByProfileId || "active")}" aria-label="${escapeHtml(gameT("gameplay.pausedAria"))}">
      <div class="games-stage-card games-stage-card--pause">
        <div class="games-pause-hero">
          <h2 class="games-stage-card__title">${escapeHtml(gameT("gameplay.pauseTitle"))}</h2>
          <p class="games-stage-card__text games-pause-hero__author">
            ${escapeHtml(pausedByPlayer ? gameT("gameplay.pauseByPlayer", { player: getPlayerFullNameByProfile(room, pausedByPlayer.profileId) }) : gameT("gameplay.pauseByUnknown"))}
          </p>
          <div
            class="games-question-timer-strip games-question-countdown games-pause-countdown"
            data-games-timer-deadline="${escapeHtml(room.pauseUntilAt)}"
            data-games-timer-start="${escapeHtml(room.pauseStartedAt)}"
            data-games-timer-total-ms="${pauseCountdownTotalMs}"
          >
            <div class="games-question-countdown__line">
              <span>${escapeHtml(gameT("gameplay.pauseResumeIn"))}: <strong class="games-question-countdown__value" data-games-timer-value>--</strong> ${escapeHtml(gameT("gameplay.secondsShort"))}.</span>
            </div>
            <span class="games-question-countdown__bar" aria-hidden="true">
              <span class="games-question-countdown__bar-fill" data-games-timer-progress></span>
            </span>
          </div>
        </div>
        ${
          pausedQuestion
            ? `
              <div class="games-paused-question">
                <span>${escapeHtml(getQuestionPositionLabel(room, pausedQuestion.position))}</span>
                <p>${escapeHtml(pausedQuestion.text)}</p>
              </div>
            `
            : ""
        }
        <div class="games-force-resume" style="--games-force-progress: ${votePercent}%">
          <div class="games-force-resume__header">
            <span class="games-force-resume__count">${escapeHtml(votesLabel)}</span>
            <span class="games-force-resume__text">${escapeHtml(gameT("gameplay.forceVotesText"))}</span>
          </div>
          <span class="games-force-resume__meter" aria-hidden="true">
            <span class="games-force-resume__meter-fill"></span>
          </span>
          <div class="games-force-resume__players">
            ${votePlayers
              .map(
                (player) => `
                  <span class="games-force-resume__player${player.forceResumeRequested ? " games-force-resume__player--voted" : ""}">
                    ${escapeHtml(getPlayerFullName(player))}
                  </span>
                `,
              )
              .join("")}
          </div>
        </div>
        ${
          canForceResume
            ? `
              <button type="button" class="games-button games-button--primary" data-games-force-resume ${loading ? "disabled" : ""}>
                ${escapeHtml(gameT("gameplay.forceResume"))}
              </button>
            `
            : currentPlayer?.profileId === room.pausedByProfileId
              ? `<p class="games-stage-card__hint">${escapeHtml(gameT("gameplay.pauseOwnerHint"))}</p>`
              : `<p class="games-stage-card__hint">${escapeHtml(gameT("gameplay.pauseVotedHint"))}</p>`
        }
      </div>
    </section>
  `;
}
