import { ApiError, apiRequest } from "./core/client";
import type { UserRole } from "./auth";
import { getSessionUser } from "../state/session";

export type TicketCategory = "bug" | "feature_request" | "complaint" | "question" | "other";
export type TicketStatus = "open" | "in_progress" | "waiting_user" | "closed";
export type TicketLine = 1 | 2;

export type Ticket = {
  id: string;
  uid: string;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  line: TicketLine;
  assignedAgentId?: string | null;
  rating?: number | null;
  media: TicketMedia[];
  createdAt: string;
  updatedAt?: string;
};

export type TicketMedia = {
  mediaID: number;
  mediaURL: string;
};

export type SupportStats = {
  total: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  closed: number;
  byCategory: Record<TicketCategory, number>;
  byLine: Record<"l1" | "l2", number>;
  avgRating: number | null;
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  createdAt: string;
};

export type TicketFilter = {
  status?: TicketStatus;
  category?: TicketCategory;
  line?: TicketLine;
  assignedAgentId?: string;
};

type RawTicket = {
  id?: number | string;
  uid?: string;
  category?: string | number;
  title?: string;
  description?: string;
  status?: string | number;
  line?: string | number;
  assigned_agent_id?: number | string | null;
  assignedAgentId?: number | string | null;
  rating?: number | string | null;
  media?: RawTicketMedia[];
  medias?: RawTicketMedia[];
  mediaURL?: string[];
  media_url?: string[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

type RawTicketMedia = {
  mediaID?: number | string;
  mediaId?: number | string;
  media_id?: number | string;
  mediaURL?: string;
  mediaUrl?: string;
  media_url?: string;
  url?: string;
};

type UploadMediaResponse = {
  media?: TicketMedia[];
};

type RawStats = {
  total?: number;
  totalCount?: number;
  open_count?: number;
  open?: number;
  openCount?: number;
  in_progress_count?: number;
  inProgress?: number;
  inProgressCount?: number;
  waiting_user_count?: number;
  waitingUser?: number;
  waitingUserCount?: number;
  closed_count?: number;
  closed?: number;
  closedCount?: number;
  by_category?: Record<string, number>;
  byCategory?: Record<string, number>;
  byStatus?: Array<{
    status?: string | number;
    count?: number;
  }>;
  byCategoryList?: Array<{
    category?: string | number;
    count?: number;
  }>;
  by_line?: Record<string, number>;
  byLine?:
    | Record<string, number>
    | Array<{
        line?: string | number;
        count?: number;
      }>;
  byLineList?: Array<{
    line?: string | number;
    count?: number;
  }>;
  avg_rating?: number | null;
  avgRating?: number | null;
  rating_distribution?: Record<string, number>;
  ratingDistribution?: Record<string, number>;
};

type RawCategoryStat = {
  category?: string | number;
  count?: number;
};

type RawLineStat = {
  line?: string | number;
  count?: number;
};

type RawTicketMessage = {
  id?: number | string;
  ID?: number | string;
  ticketId?: number | string;
  ticket_id?: number | string;
  text?: string;
  Text?: string;
  authorId?: number | string;
  author_id?: number | string;
  authorName?: string;
  author_name?: string;
  authorRole?: string;
  author_role?: string;
  createdAt?: string;
  created_at?: string;
};

const CATEGORY_TO_CODE: Record<TicketCategory, number> = {
  bug: 0,
  feature_request: 1,
  complaint: 2,
  question: 3,
  other: 4,
};

const CODE_TO_CATEGORY: Record<number, TicketCategory> = {
  0: "bug",
  1: "feature_request",
  2: "complaint",
  3: "question",
  4: "other",
};

const CODE_TO_STATUS: Record<number, TicketStatus> = {
  0: "open",
  1: "in_progress",
  2: "waiting_user",
  3: "closed",
};

function emptyCategoryStats(): Record<TicketCategory, number> {
  return {
    bug: 0,
    feature_request: 0,
    complaint: 0,
    question: 0,
    other: 0,
  };
}

function emptyLineStats(): Record<"l1" | "l2", number> {
  return { l1: 0, l2: 0 };
}

function emptyRatingDistribution(): Record<"1" | "2" | "3" | "4" | "5", number> {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
}

function mapCategoryKey(value: string | number | undefined): TicketCategory | null {
  if (typeof value === "number") {
    return CODE_TO_CATEGORY[value] ?? null;
  }

  const numericValue = value === undefined || value.trim() === "" ? Number.NaN : Number(value);
  if (Number.isInteger(numericValue)) {
    return CODE_TO_CATEGORY[numericValue] ?? null;
  }

  switch (value) {
    case "bug":
      return "bug";
    case "feature_request":
    case "featureRequest":
      return "feature_request";
    case "complaint":
      return "complaint";
    case "question":
      return "question";
    case "other":
      return "other";
    default:
      return null;
  }
}

function mapStatusKey(value: string | number | undefined): TicketStatus | null {
  if (typeof value === "number") {
    return CODE_TO_STATUS[value] ?? null;
  }

  const numericValue = value === undefined || value.trim() === "" ? Number.NaN : Number(value);
  if (Number.isInteger(numericValue)) {
    return CODE_TO_STATUS[numericValue] ?? null;
  }

  switch (value) {
    case "open":
      return "open";
    case "in_progress":
    case "inProgress":
      return "in_progress";
    case "waiting_user":
    case "waitingUser":
      return "waiting_user";
    case "closed":
      return "closed";
    default:
      return null;
  }
}

function mapLine(value: string | number | undefined): TicketLine {
  if (value === 2 || value === "2" || value === "l2" || value === "L2") {
    return 2;
  }
  return 1;
}

function mapUserRole(value: string | undefined): UserRole {
  if (value === "support_l1" || value === "support_l2" || value === "admin") {
    return value;
  }
  return "user";
}

function mapTicketMedia(raw: RawTicketMedia): TicketMedia | null {
  const rawId = raw.mediaID ?? raw.mediaId ?? raw.media_id;
  const rawUrl = raw.mediaURL ?? raw.mediaUrl ?? raw.media_url ?? raw.url;
  const mediaID = Number(rawId);
  const mediaURL = rawUrl ? String(rawUrl) : "";

  if (!Number.isFinite(mediaID) || mediaID <= 0 || !mediaURL) {
    return null;
  }

  return { mediaID, mediaURL };
}

function mapTicketMediaList(raw: RawTicket): TicketMedia[] {
  const media = raw.media ?? raw.medias;
  if (Array.isArray(media)) {
    return media.map(mapTicketMedia).filter((item): item is TicketMedia => Boolean(item));
  }

  const urls = raw.mediaURL ?? raw.media_url;
  if (Array.isArray(urls)) {
    return urls
      .map((url, index) => mapTicketMedia({ mediaID: index + 1, mediaURL: url }))
      .filter((item): item is TicketMedia => Boolean(item));
  }

  return [];
}

function buildCategoryStats(
  byCategoryRecord?: Record<string, number>,
  byCategoryList?: RawCategoryStat[],
): Record<TicketCategory, number> {
  const stats = emptyCategoryStats();

  if (byCategoryRecord) {
    for (const [key, value] of Object.entries(byCategoryRecord)) {
      const category = mapCategoryKey(key);
      if (category) {
        stats[category] = value ?? 0;
      }
    }
  }

  if (Array.isArray(byCategoryList)) {
    for (const item of byCategoryList) {
      const category = mapCategoryKey(item.category);
      if (category) {
        stats[category] = item.count ?? 0;
      }
    }
  }

  return stats;
}

function buildLineStats(
  byLineRecord?: Record<string, number>,
  byLineList?: RawLineStat[],
): Record<"l1" | "l2", number> {
  const stats = emptyLineStats();

  if (byLineRecord) {
    for (const [key, value] of Object.entries(byLineRecord)) {
      const line = mapLine(key);
      stats[line === 2 ? "l2" : "l1"] = value ?? 0;
    }
  }

  if (Array.isArray(byLineList)) {
    for (const item of byLineList) {
      const line = mapLine(item.line);
      stats[line === 2 ? "l2" : "l1"] = item.count ?? 0;
    }
  }

  return stats;
}

function buildRatingDistribution(
  raw?: Record<string, number>,
): Record<"1" | "2" | "3" | "4" | "5", number> {
  const stats = emptyRatingDistribution();

  if (!raw) {
    return stats;
  }

  for (const key of Object.keys(stats) as Array<keyof typeof stats>) {
    stats[key] = raw[key] ?? 0;
  }

  return stats;
}

function mapTicket(raw: RawTicket): Ticket {
  const updatedAt = raw.updatedAt ?? raw.updated_at;
  const rawCategory = mapCategoryKey(raw.category) ?? "other";
  const rawStatus = mapStatusKey(raw.status) ?? "open";

  return {
    id: String(raw.id ?? ""),
    uid: raw.uid ?? "",
    category: rawCategory,
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: rawStatus,
    line: mapLine(raw.line),
    assignedAgentId:
      raw.assignedAgentId === null || raw.assigned_agent_id === null
        ? null
        : raw.assignedAgentId !== undefined
          ? String(raw.assignedAgentId)
          : raw.assigned_agent_id !== undefined
            ? String(raw.assigned_agent_id)
            : null,
    rating:
      raw.rating === null || raw.rating === undefined || raw.rating === ""
        ? null
        : Number(raw.rating),
    media: mapTicketMediaList(raw),
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function mapTicketMessage(raw: RawTicketMessage): TicketMessage {
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    ticketId: String(raw.ticketId ?? raw.ticket_id ?? ""),
    text: String(raw.text ?? raw.Text ?? ""),
    authorId: String(raw.authorId ?? raw.author_id ?? ""),
    authorName: String(raw.authorName ?? raw.author_name ?? "Поддержка"),
    authorRole: mapUserRole(raw.authorRole ?? raw.author_role),
    createdAt: raw.createdAt ?? raw.created_at ?? "",
  };
}

function buildTicketFilterQuery(filter?: TicketFilter): string {
  if (!filter) return "";

  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.category) params.set("category", filter.category);
  if (filter.line) params.set("line", String(filter.line));
  if (filter.assignedAgentId) params.set("assignedAgentId", filter.assignedAgentId);

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function createTicket(data: {
  category: TicketCategory;
  login: string;
  email: string;
  title: string;
  description: string;
  screenshot?: File | null;
}): Promise<Ticket> {
  const media = data.screenshot ? [await uploadSupportScreenshot(data.screenshot)] : [];

  const raw = await apiRequest<RawTicket>(
    "/api/support/tickets",
    {
      method: "POST",
      body: {
        category: CATEGORY_TO_CODE[data.category],
        login: data.login,
        email: data.email,
        title: data.title,
        description: data.description,
        ...(media.length ? { media } : {}),
      },
    },
    {},
  );
  return mapTicket(raw);
}

export async function uploadSupportScreenshot(file: File): Promise<TicketMedia> {
  const formData = new FormData();
  formData.append("files", file);

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=support",
    { method: "POST", body: formData },
    {},
  );

  const uploadedFile = Array.isArray((data as UploadMediaResponse).media)
    ? (data as UploadMediaResponse).media?.[0]
    : null;

  if (!uploadedFile) {
    throw new ApiError("failed to upload support screenshot", 200, data);
  }

  return uploadedFile;
}

export async function getMyTickets(): Promise<Ticket[]> {
  const raw = await apiRequest<{ tickets?: RawTicket[] } | RawTicket[]>(
    "/api/support/tickets/my",
    {},
    {},
  );
  const list = Array.isArray(raw) ? raw : (raw.tickets ?? []);
  return list.map(mapTicket);
}

export async function getAllTickets(
  filter?: TicketFilter,
  signal?: AbortSignal,
): Promise<Ticket[]> {
  const raw = await apiRequest<{ tickets?: RawTicket[] } | RawTicket[]>(
    `/api/support/tickets${buildTicketFilterQuery(filter)}`,
    { ...(signal ? { signal } : {}) },
    [],
  );
  const list = Array.isArray(raw) ? raw : (raw.tickets ?? []);
  return list.map(mapTicket);
}

export async function getTicketById(id: string): Promise<Ticket> {
  const raw = await apiRequest<RawTicket>(`/api/support/tickets/${encodeURIComponent(id)}`, {}, {});
  return mapTicket(raw);
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<void> {
  await apiRequest<unknown>(
    `/api/support/tickets/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: { status },
    },
    {},
  );
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const raw = await apiRequest<{ messages?: RawTicketMessage[] } | RawTicketMessage[]>(
    `/api/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    {},
    [],
  );
  const list = Array.isArray(raw) ? raw : (raw.messages ?? []);
  return list.map(mapTicketMessage).filter((message) => Boolean(message.id));
}

export async function sendTicketMessage(
  ticketId: string,
  payload: { text: string },
): Promise<TicketMessage> {
  const raw = await apiRequest<RawTicketMessage>(
    `/api/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    { method: "POST", body: payload },
    {},
  );
  return mapTicketMessage(raw);
}

function getSupportSocketUrl(ticketId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/support/${encodeURIComponent(ticketId)}`;
}

export function subscribeToTicketMessages(
  ticketId: string,
  handlers: {
    onMessage: (message: TicketMessage) => void;
    onError?: (event: Event) => void;
  },
): () => void {
  if (!getSessionUser()) {
    return () => {};
  }

  const socket = new WebSocket(getSupportSocketUrl(ticketId));

  socket.addEventListener("message", (event: MessageEvent<string>) => {
    try {
      const message = mapTicketMessage(JSON.parse(event.data) as RawTicketMessage);
      if (message.id) {
        handlers.onMessage(message);
      }
    } catch (error) {
      console.error("[support] failed to parse websocket message", error);
    }
  });

  if (handlers.onError) {
    socket.addEventListener("error", handlers.onError);
  }

  return () => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}

export async function assignTicket(ticketId: string, agentId: string): Promise<void> {
  await apiRequest<unknown>(
    `/api/support/tickets/${encodeURIComponent(ticketId)}/assign`,
    { method: "PATCH", body: { agentId } },
    {},
  );
}

export async function escalateTicket(
  ticketId: string,
  payload: { reason?: string } = {},
): Promise<void> {
  await apiRequest<unknown>(
    `/api/support/tickets/${encodeURIComponent(ticketId)}/escalate`,
    { method: "PATCH", body: payload },
    {},
  );
}

export async function rateTicket(ticketId: string, payload: { rating: number }): Promise<void> {
  await apiRequest<unknown>(
    `/api/support/tickets/${encodeURIComponent(ticketId)}/rating`,
    { method: "POST", body: payload },
    {},
  );
}

export async function getSupportStats(signal?: AbortSignal): Promise<SupportStats> {
  const raw = await apiRequest<RawStats>(
    "/api/support/stats",
    { ...(signal ? { signal } : {}) },
    {},
  );
  const byStatus = Array.isArray(raw.byStatus) ? raw.byStatus : [];
  const byCategory = buildCategoryStats(
    (raw.by_category ?? raw.byCategory) as Record<string, number> | undefined,
    raw.byCategoryList ??
      ((Array.isArray(raw.byCategory) ? raw.byCategory : undefined) as
        | RawCategoryStat[]
        | undefined),
  );
  const byLine = buildLineStats(
    (raw.by_line ?? raw.byLine) as Record<string, number> | undefined,
    raw.byLineList ??
      ((Array.isArray(raw.byLine) ? raw.byLine : undefined) as RawLineStat[] | undefined),
  );

  const statusCounts: Partial<Record<TicketStatus, number>> = {};
  for (const item of byStatus) {
    const status = mapStatusKey(item.status);
    if (status) {
      statusCounts[status] = item.count ?? 0;
    }
  }

  return {
    total: raw.total ?? raw.totalCount ?? 0,
    open: raw.open_count ?? raw.open ?? raw.openCount ?? statusCounts.open ?? 0,
    inProgress:
      raw.in_progress_count ??
      raw.inProgress ??
      raw.inProgressCount ??
      statusCounts.in_progress ??
      0,
    waitingUser:
      raw.waiting_user_count ??
      raw.waitingUser ??
      raw.waitingUserCount ??
      statusCounts.waiting_user ??
      0,
    closed: raw.closed_count ?? raw.closed ?? raw.closedCount ?? statusCounts.closed ?? 0,
    byCategory,
    byLine,
    avgRating: raw.avg_rating ?? raw.avgRating ?? null,
    ratingDistribution: buildRatingDistribution(raw.rating_distribution ?? raw.ratingDistribution),
  };
}
