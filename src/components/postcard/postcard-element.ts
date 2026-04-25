import { renderPostcardInner, initPostcardExpand, type PostcardPost } from "./postcard";
export class ArisPostcard extends HTMLElement {
  connectedCallback(): void {
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
