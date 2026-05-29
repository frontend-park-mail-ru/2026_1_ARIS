import type { GameRoom } from "../../../../api/games";
import { getLatestCompletedQuestion, getQuestionResultSignature } from "../../round/model";
import { getFinalRoundResultsUntil, isRoundResultRevealVisible } from "../../round/reveal";
import {
  getRoundResultTimerStartMs,
  getRoundResultTransitionEndDelayMs,
  getRoundResultTransitionEndMs,
} from "../../round/timeline";
import { refreshGamesOverlayDom } from "./overlay";
import { syncGamesDomAfterRender } from "./sync";
import type { GamesDomRefreshOptions, GamesDomRefreshRoot } from "./types";
import { debugGamesEvent, debugGamesVerboseEvent } from "../debug";

/**
 * Проверяет, нужно ли пересобрать app shell из-за смены layout комнаты.
 */
export function shouldRerenderGamesShell(
  root: GamesDomRefreshRoot,
  room: GameRoom | null,
): boolean {
  if (!root || !room) return false;
  const needsGameRoomLayout = room.status !== "waiting";
  const hasGameRoomLayout = Boolean(root.querySelector(".app-layout--game-room"));
  return needsGameRoomLayout !== hasGameRoomLayout;
}

function getActiveQuestionId(room: GameRoom | null): string {
  return room?.status === "active" ? (room.currentQuestion?.id ?? "") : "";
}

function shouldPreserveMountedActiveQuestion(content: HTMLElement, room: GameRoom | null): boolean {
  const activeQuestionId = getActiveQuestionId(room);
  if (!activeQuestionId) return false;
  const mountedQuestion = content.querySelector<HTMLElement>("[data-games-active-question-id]");
  return mountedQuestion?.dataset.gamesActiveQuestionId === activeQuestionId;
}

function getVisibleRoundResultQuestionId(room: GameRoom | null): string {
  if (!room) return "";
  if (!isRoundResultRevealVisible(room)) return "";
  if (room.status === "active" && room.currentQuestion) return "";
  if (!Array.isArray(room.questions)) return "";
  const latestCompleted = getLatestCompletedQuestion(room);
  return latestCompleted?.id ?? "";
}

function getVisibleRoundResultSignature(room: GameRoom | null): string {
  if (!room || !Array.isArray(room.questions)) return "";
  const latestCompleted = getLatestCompletedQuestion(room);
  return latestCompleted ? getQuestionResultSignature(latestCompleted) : "";
}

function shouldPreserveMountedRoundResult(content: HTMLElement, room: GameRoom | null): boolean {
  const resultQuestionId = getVisibleRoundResultQuestionId(room);
  if (!resultQuestionId) return false;
  const mountedResult = content.querySelector<HTMLElement>("[data-games-round-result-stage]");
  return (
    mountedResult?.dataset.gamesRoundResultQuestionId === resultQuestionId &&
    mountedResult.dataset.gamesRoundResultSignature === getVisibleRoundResultSignature(room)
  );
}

function getRoundResultDynamicSignature(element: HTMLElement): string {
  const timer = element.querySelector<HTMLElement>("[data-games-timer-deadline]");
  const finalResultsUntil = element.querySelector<HTMLElement>("[data-games-final-results-until]");
  return [
    timer?.dataset.gamesTimerDeadline ?? "",
    timer?.dataset.gamesTimerDelayUntil ?? "",
    timer?.dataset.gamesTimerStart ?? "",
    timer?.dataset.gamesTimerTotalMs ?? "",
    finalResultsUntil?.dataset.gamesFinalResultsUntil ?? "",
  ].join("|");
}

function getMountedRoundResultDynamicSignature(content: HTMLElement): string {
  const mountedDynamic = content.querySelector<HTMLElement>("[data-games-round-result-dynamic]");
  return mountedDynamic ? getRoundResultDynamicSignature(mountedDynamic) : "";
}

function getVisibleRoundResultDynamicSignature(room: GameRoom | null): string {
  if (!room || !Array.isArray(room.questions)) return "";
  const latestCompleted = getLatestCompletedQuestion(room);
  if (!latestCompleted) return "";

  const finalResultsUntil = getFinalRoundResultsUntil(room, latestCompleted);
  if (!room.nextQuestionAt && !finalResultsUntil) return "";

  const timerStartMs = getRoundResultTimerStartMs(room, latestCompleted);
  const timerDeadlineAt = new Date(
    finalResultsUntil?.getTime() ?? getRoundResultTransitionEndMs(room, latestCompleted),
  ).toISOString();
  return [
    timerDeadlineAt,
    String(timerStartMs),
    new Date(timerStartMs).toISOString(),
    String(getRoundResultTransitionEndDelayMs(room, latestCompleted)),
    finalResultsUntil?.toISOString() ?? "",
  ].join("|");
}

function syncMountedRoundResultDynamic(content: HTMLElement, nextContentHtml: string): boolean {
  const mountedDynamic = content.querySelector<HTMLElement>("[data-games-round-result-dynamic]");
  if (!mountedDynamic) return false;

  const template = document.createElement("template");
  template.innerHTML = nextContentHtml;
  const nextDynamic = template.content.querySelector<HTMLElement>(
    "[data-games-round-result-dynamic]",
  );
  if (!nextDynamic) return false;
  if (
    getRoundResultDynamicSignature(mountedDynamic) === getRoundResultDynamicSignature(nextDynamic)
  ) {
    return false;
  }

  mountedDynamic.innerHTML = nextDynamic.innerHTML;
  return true;
}

/**
 * Обновляет content, rail и внешний чат без пересборки app shell.
 */
function refreshMountedGamesContent(options: GamesDomRefreshOptions): {
  preservedActiveQuestion: boolean;
  preservedRoundResult: boolean;
} {
  const { root } = options;
  if (!root) return { preservedActiveQuestion: false, preservedRoundResult: false };
  const content = root.querySelector<HTMLElement>("[data-games-content]");
  if (!content) return { preservedActiveQuestion: false, preservedRoundResult: false };

  const preserveActiveQuestion = shouldPreserveMountedActiveQuestion(content, options.room);
  const preserveRoundResult =
    !preserveActiveQuestion && shouldPreserveMountedRoundResult(content, options.room);
  const debugPayload = {
    roomId: options.room?.id ?? "",
    status: options.room?.status ?? "",
    currentQuestionId: options.room?.currentQuestion?.id ?? "",
    currentQuestionIndex: options.room?.currentQuestionIndex ?? 0,
    preserveActiveQuestion,
    preserveRoundResult,
  };
  if (preserveActiveQuestion || preserveRoundResult) {
    debugGamesVerboseEvent("refresh mounted games content", debugPayload);
  } else {
    debugGamesEvent("refresh mounted games content", debugPayload);
  }
  if (preserveActiveQuestion) {
    debugGamesVerboseEvent("preserve mounted active question content", {
      roomId: options.room?.id ?? "",
      currentQuestionId: options.room?.currentQuestion?.id ?? "",
    });
    refreshGamesOverlayDom(options);
    return { preservedActiveQuestion: true, preservedRoundResult: false };
  }

  if (preserveRoundResult) {
    debugGamesVerboseEvent("preserve mounted round result content", {
      roomId: options.room?.id ?? "",
      questionId: getVisibleRoundResultQuestionId(options.room),
    });
    const dynamicChanged =
      getMountedRoundResultDynamicSignature(content) ===
      getVisibleRoundResultDynamicSignature(options.room)
        ? false
        : syncMountedRoundResultDynamic(content, options.renderContent());
    refreshGamesOverlayDom(options);
    if (dynamicChanged) {
      options.startCountdown(root);
    }
    return { preservedActiveQuestion: false, preservedRoundResult: true };
  } else {
    content.innerHTML = options.renderContent();
  }
  refreshGamesOverlayDom(options);

  const playersRail = root.querySelector<HTMLElement>("[data-games-room-players-rail]");
  if (playersRail) {
    playersRail.innerHTML = options.room ? options.renderPlayersRail(options.room) : "";
  }

  const externalChat = root.querySelector<HTMLElement>("[data-games-external-chat]");
  if (externalChat) {
    externalChat.innerHTML = options.room ? options.renderRoomChat(options.room) : "";
  }
  return { preservedActiveQuestion: false, preservedRoundResult: preserveRoundResult };
}

/**
 * Обновляет контент страницы игр без пересборки app shell.
 */
export function refreshGamesDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  if (shouldRerenderGamesShell(root, options.room)) {
    refreshGamesShellDom(options);
    return;
  }

  const result = refreshMountedGamesContent(options);
  if (result.preservedActiveQuestion || result.preservedRoundResult) return;
  syncGamesDomAfterRender(options);
}

/**
 * Пересобирает полный app shell страницы игр.
 */
export function refreshGamesShellDom(options: GamesDomRefreshOptions): void {
  const { root } = options;
  if (!root) return;
  const page = root.querySelector<HTMLElement>(".app-page");
  if (!page) return;

  debugGamesEvent("refresh games shell", {
    roomId: options.room?.id ?? "",
    status: options.room?.status ?? "",
    currentQuestionId: options.room?.currentQuestion?.id ?? "",
    currentQuestionIndex: options.room?.currentQuestionIndex ?? 0,
  });
  page.outerHTML = options.renderPageShell();
  syncGamesDomAfterRender(options, { syncRoomSubscription: true });
}
