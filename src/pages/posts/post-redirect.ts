import { getPostById } from "../../api/posts";
import type { RouteParams } from "../../router/router";

export async function renderPostRedirect(
  params: RouteParams = {},
  signal?: AbortSignal,
): Promise<string> {
  const postId = params["id"];

  if (!postId) {
    window.history.replaceState({}, "", "/feed");
    window.dispatchEvent(new PopStateEvent("popstate"));
    return "";
  }

  try {
    const post = await getPostById(postId, signal);

    let targetUrl: string;
    if (post.communityId && post.communityId > 0) {
      targetUrl = `/communities/${encodeURIComponent(String(post.communityId))}?postId=${encodeURIComponent(postId)}`;
    } else {
      targetUrl = `/profile/${encodeURIComponent(String(post.profileID))}?postId=${encodeURIComponent(postId)}`;
    }

    window.history.replaceState({}, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    window.history.replaceState({}, "", "/feed");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return "";
}
