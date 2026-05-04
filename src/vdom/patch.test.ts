/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { domPatch } from "./patch";

function elementFromHtml(html: string): Element {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as Element;
}

describe("domPatch", () => {
  it("обновляет атрибуты и текст без замены корневого элемента", () => {
    const live = elementFromHtml('<section class="old" data-old="1">Привет</section>');
    const next = elementFromHtml('<section class="new" data-id="42">Пока</section>');

    domPatch(live, next);

    expect(live.outerHTML).toBe('<section class="new" data-id="42">Пока</section>');
  });

  it("переупорядочивает keyed-элементы и удаляет лишние", () => {
    const live = elementFromHtml(`
      <ul>
        <li data-id="1">one</li>
        <li data-id="2">two</li>
        <li data-id="3">three</li>
      </ul>
    `);
    const firstNode = live.querySelector('[data-id="1"]');
    const next = elementFromHtml(`
      <ul>
        <li data-id="2">two updated</li>
        <li data-id="1">one</li>
      </ul>
    `);

    domPatch(live, next);

    expect(live.textContent?.replace(/\s+/g, " ").trim()).toBe("two updated one");
    expect(live.querySelectorAll("li")).toHaveLength(2);
    expect(live.querySelector('[data-id="1"]')).toBe(firstNode);
  });

  it("вставляет новые узлы и заменяет несовпадающие теги", () => {
    const host = document.createElement("div");
    const live = elementFromHtml("<p><span>old</span></p>");
    host.append(live);
    const next = elementFromHtml("<article><strong>new</strong></article>");

    domPatch(live, next);

    expect(host.innerHTML).toBe("<article><strong>new</strong></article>");
  });
});
