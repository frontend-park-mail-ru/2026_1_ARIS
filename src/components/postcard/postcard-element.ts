/**
 * Web Component-обёртка для карточки поста.
 */
import { renderPostcardInner, initPostcardExpand, type PostcardPost } from "./postcard";

export class ArisPostcard extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["data-post"];
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
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

    this.innerHTML = renderPostcardInner(post);
    initPostcardExpand(this);
  }
}

if (!customElements.get("aris-postcard")) {
  customElements.define("aris-postcard", ArisPostcard);
}
