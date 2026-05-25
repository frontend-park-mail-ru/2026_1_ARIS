import type { User } from "../../../../api/auth";
import type { GameRoom } from "../../../../api/games";
import type { ReportableGameQuestion } from "../../state/store";

export type QuestionReportState = {
  reportingKeys: ReadonlySet<string>;
  reportedKeys: ReadonlySet<string>;
  openQuestionKey?: string;
};

export type QuestionReportUiOptions = {
  getRoot: () => Document | HTMLElement | null;
  reportingKeys: Set<string>;
  reportedKeys: Set<string>;
  getOpenQuestionKey: () => string;
};

export type QuestionReportDescriptionOptions = {
  room: GameRoom;
  question: ReportableGameQuestion;
  user: User | null;
  pageUrl?: string;
  reportedAt?: Date;
};
