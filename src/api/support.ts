import { apiRequest } from "./core/client";

export type TicketCategory = "bug" | "feature_request" | "complaint" | "question" | "other";
export type TicketStatus = "open" | "in_progress" | "waiting_user" | "closed";

export type Ticket = {
  id: string;
  uid: string;
  category: TicketCategory;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
};

export type SupportStats = {
  total: number;
  open: number;
  inProgress: number;
  waitingUser: number;
  closed: number;
  byCategory: Record<TicketCategory, number>;
};

type RawTicket = {
  id?: number | string;
  uid?: string;
  category?: string;
  title?: string;
  description?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

type RawStats = {
  total?: number;
  open_count?: number;
  open?: number;
  in_progress_count?: number;
  inProgress?: number;
  waiting_user_count?: number;
  waitingUser?: number;
  closed_count?: number;
  closed?: number;
  by_category?: Record<string, number>;
  byCategory?: Record<string, number>;
};

function mapTicket(raw: RawTicket): Ticket {
  const updatedAt = raw.updatedAt ?? raw.updated_at;

  return {
    id: String(raw.id ?? ""),
    uid: raw.uid ?? "",
    category: (raw.category ?? "other") as TicketCategory,
    title: raw.title ?? "",
    description: raw.description ?? "",
    status: (raw.status ?? "open") as TicketStatus,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    ...(updatedAt ? { updatedAt } : {}),
  };
}

export async function createTicket(data: {
  category: TicketCategory;
  login: string;
  email: string;
  title: string;
  description: string;
  screenshot?: File | null;
}): Promise<Ticket> {
  const formData = new FormData();
  formData.append("category", data.category);
  formData.append("login", data.login);
  formData.append("email", data.email);
  formData.append("title", data.title);
  formData.append("description", data.description);
  if (data.screenshot) {
    formData.append("screenshot", data.screenshot, data.screenshot.name);
  }

  const response = await fetch("/api/support/tickets", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`request to /api/support/tickets failed: ${response.status} ${text}`);
  }

  const raw = (await response.json()) as RawTicket;
  return mapTicket(raw);
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

export async function getSupportStats(): Promise<SupportStats> {
  const raw = await apiRequest<RawStats>("/api/support/stats", {}, {});
  const byCategory = (raw.by_category ?? raw.byCategory ?? {}) as Record<string, number>;

  return {
    total: raw.total ?? 0,
    open: raw.open_count ?? raw.open ?? 0,
    inProgress: raw.in_progress_count ?? raw.inProgress ?? 0,
    waitingUser: raw.waiting_user_count ?? raw.waitingUser ?? 0,
    closed: raw.closed_count ?? raw.closed ?? 0,
    byCategory: {
      bug: byCategory["bug"] ?? 0,
      feature_request: byCategory["feature_request"] ?? 0,
      complaint: byCategory["complaint"] ?? 0,
      question: byCategory["question"] ?? 0,
      other: byCategory["other"] ?? 0,
    },
  };
}
