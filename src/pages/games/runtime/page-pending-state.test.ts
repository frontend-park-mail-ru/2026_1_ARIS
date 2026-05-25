import { describe, expect, it } from "vitest";
import type { PendingRankedToast } from "../actions/room-live";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import { createGamesPagePendingState } from "./page-pending-state";

describe("games page pending state", () => {
  it("хранит pending toast смены ranked-режима", () => {
    const pendingState = createGamesPagePendingState();
    const toast: PendingRankedToast = { roomId: "room-1", isRanked: true };

    pendingState.setPendingRankedToast(toast);

    expect(pendingState.getPendingRankedToast()).toBe(toast);
  });

  it("хранит pending voluntary leave", () => {
    const pendingState = createGamesPagePendingState();
    const pending = { roomId: "room-1" } as PendingVoluntaryLeave;

    pendingState.setPendingVoluntaryLeave(pending);

    expect(pendingState.getPendingVoluntaryLeave()).toBe(pending);
  });

  it("отдаёт стабильные sets для ключей жалоб", () => {
    const pendingState = createGamesPagePendingState();

    pendingState.reportingQuestionKeys.add("question-1");
    pendingState.reportedQuestionKeys.add("question-2");

    expect(pendingState.reportingQuestionKeys.has("question-1")).toBe(true);
    expect(pendingState.reportedQuestionKeys.has("question-2")).toBe(true);
  });
});
