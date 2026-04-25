import { renderPostcardInner, initPostcardExpandInShadow, type PostcardPost } from "./postcard";

let sharedSheet: CSSStyleSheet | null = null;

/**
 * Извлекает правила .postcard из уже загруженных стилей документа.
 * Создаётся один раз и переиспользуется всеми инстансами через adoptedStyleSheets.
 */
function getSharedSheet(): CSSStyleSheet {
  if (sharedSheet) return sharedSheet;

  const cssText: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (/\bpostcard\b/.test(rule.cssText)) {
          cssText.push(rule.cssText);
        }
      }
    } catch {
      // Пропускаем заблокированные CORS-стили
    }
  }

  sharedSheet = new CSSStyleSheet();
  // Наследуем CSS custom properties от :root (токены), добавляем правила компонента
  sharedSheet.replaceSync(`:host { display: contents; }\n` + cssText.join("\n"));
  return sharedSheet;
}

export class ArisPostcard extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    this.render();
    initPostcardExpandInShadow(this.shadow);
  }

  private render(): void {
    const raw = this.getAttribute("data-post");
    if (!raw) return;

    let post: PostcardPost;
    try {
      post = JSON.parse(raw) as PostcardPost;
    } catch {
      return;
    }

    this.shadow.adoptedStyleSheets = [getSharedSheet()];
    this.shadow.innerHTML = renderPostcardInner(post);
  }
}

if (!customElements.get("aris-postcard")) {
  customElements.define("aris-postcard", ArisPostcard);
}
