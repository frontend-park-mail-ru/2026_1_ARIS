const POST_LIKE_STATE_KEY = "arisfront:post-like-state";

type PostLikeStateMap = Record<string, boolean>;

function normalizePostId(postId: string | number | null | undefined): string {
  return String(postId ?? "").trim();
}

function readPostLikeStateMap(): PostLikeStateMap {
  try {
    const raw = localStorage.getItem(POST_LIKE_STATE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] =>
          typeof entry[0] === "string" && typeof entry[1] === "boolean",
      ),
    );
  } catch {
    return {};
  }
}

function writePostLikeStateMap(nextState: PostLikeStateMap): void {
  try {
    localStorage.setItem(POST_LIKE_STATE_KEY, JSON.stringify(nextState));
  } catch {
    // Игнорируем ошибки хранилища, чтобы UI продолжал работать.
  }
}

export function resolvePostLikeState(
  postId: string | number | null | undefined,
  serverValue?: boolean,
): boolean {
  if (typeof serverValue === "boolean") {
    return serverValue;
  }

  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return false;
  }

  const stateMap = readPostLikeStateMap();
  return stateMap[normalizedPostId] === true;
}

export function rememberPostLikeState(postId: string | number, isLiked: boolean): void {
  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return;
  }

  const stateMap = readPostLikeStateMap();
  stateMap[normalizedPostId] = isLiked;
  writePostLikeStateMap(stateMap);
}
