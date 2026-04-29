/**
 * Логика списка постов на странице профиля.
 */
function getActiveProfilePostFilter(root: Document | HTMLElement): "all" | "own" {
  const activeButton = root.querySelector<HTMLElement>("[data-profile-post-filter].is-active");
  return activeButton?.getAttribute("data-profile-post-filter") === "own" ? "own" : "all";
}

export function switchProfilePostFilter(
  root: Document | HTMLElement,
  nextFilter: "all" | "own",
): void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  preserveProfilePostsHeight(root);

  root.querySelectorAll<HTMLButtonElement>("[data-profile-post-filter]").forEach((button) => {
    const isActive = button.getAttribute("data-profile-post-filter") === nextFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  applyProfilePostFilters(root);
  preserveProfilePostsHeight(root);

  window.scrollTo(scrollX, scrollY);
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
  });
}

function preserveProfilePostsHeight(root: Document | HTMLElement): void {
  const postsList = root.querySelector<HTMLElement>("[data-profile-post-list]");
  if (!postsList) {
    return;
  }

  const currentHeight = Math.ceil(postsList.getBoundingClientRect().height);
  const storedHeight = Number(postsList.dataset.profilePostsMinHeight || 0);
  const nextHeight = Math.max(currentHeight, storedHeight);

  postsList.dataset.profilePostsMinHeight = String(nextHeight);
  postsList.style.minHeight = `${nextHeight}px`;
}

export function openProfilePostSearch(root: Document | HTMLElement): void {
  const toolbar = root.querySelector<HTMLElement>("[data-profile-post-toolbar]");
  const searchPanel = root.querySelector<HTMLElement>("[data-profile-post-search-panel]");
  const searchInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");

  if (toolbar) toolbar.hidden = true;
  if (searchPanel) searchPanel.hidden = false;
  searchInput?.focus();
}

export function closeProfilePostSearch(root: Document | HTMLElement): void {
  const toolbar = root.querySelector<HTMLElement>("[data-profile-post-toolbar]");
  const searchPanel = root.querySelector<HTMLElement>("[data-profile-post-search-panel]");
  const searchInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");

  if (searchInput) {
    searchInput.value = "";
  }

  if (searchPanel) searchPanel.hidden = true;
  if (toolbar) toolbar.hidden = false;
  applyProfilePostFilters(root);
}

export function closeProfilePostMenus(root: Document | HTMLElement): void {
  document.querySelectorAll<HTMLElement>("[data-profile-post-menu]").forEach((menu) => {
    menu.hidden = true;
    menu.style.top = "";
    menu.style.right = "";
    menu.style.left = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-profile-post-menu-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

export function applyProfilePostFilters(root: Document | HTMLElement): void {
  const queryInput = root.querySelector<HTMLInputElement>("[data-profile-post-search]");
  const query = queryInput?.value.trim().toLowerCase() ?? "";
  const scope = getActiveProfilePostFilter(root);
  const cards = root.querySelectorAll<HTMLElement>("[data-profile-post-card]");
  let visibleCount = 0;
  let firstVisibleCard: HTMLElement | undefined;

  cards.forEach((card) => {
    const cardScope = card.getAttribute("data-profile-post-scope") ?? "all";
    const searchable = card.getAttribute("data-profile-post-searchable") ?? "";
    const matchesScope = scope === "all" || cardScope === "own";
    const matchesQuery = !query || searchable.includes(query);
    const isVisible = matchesScope && matchesQuery;

    card.hidden = !isVisible;
    card.classList.remove("profile-post--first-visible");

    if (isVisible) {
      visibleCount += 1;

      if (!firstVisibleCard) {
        firstVisibleCard = card;
      }
    }
  });

  if (firstVisibleCard) {
    firstVisibleCard.classList.add("profile-post--first-visible");
  }

  const searchEmptyState = root.querySelector<HTMLElement>("[data-profile-post-search-empty]");
  if (searchEmptyState) {
    searchEmptyState.hidden = visibleCount > 0 || !query;
  }
}

export function initProfilePostListLayout(root: Document | HTMLElement): void {
  preserveProfilePostsHeight(root);
  requestAnimationFrame(() => {
    preserveProfilePostsHeight(root);
  });
}
