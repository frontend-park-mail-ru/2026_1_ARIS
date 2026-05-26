import { getCompletedQuestions } from "../../round/model";
import { renderFinalQuestionsArchive } from "./archive";
import { renderRatingChanges } from "./rating";
import { renderFinalStandings } from "./standings";
import type { RenderFinalGameStageOptions } from "./types";
import { renderFinalWinnerHero } from "./winner";

export type { RenderFinalGameStageOptions } from "./types";

/** Рендерит финальный экран игры с победителем, местами и архивом вопросов. */
export function renderFinalGameStage(options: RenderFinalGameStageOptions): string {
  const completed = getCompletedQuestions(options.room);

  return `
    <section class="games-game-stage games-game-stage--final" aria-label="Итоги игры">
      <div class="games-stage-card games-stage-card--final">
        ${renderFinalWinnerHero(options, completed.length)}
        <h3 class="games-final-section-title">Таблица участников</h3>
        ${renderFinalStandings(options)}
        ${renderRatingChanges(options)}
        ${renderFinalQuestionsArchive(options, completed)}
      </div>
    </section>
  `;
}
