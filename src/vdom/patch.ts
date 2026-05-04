/**
 * Минимальный DOM-диффер. Обновляет `live` на месте, применяя только те мутации,
 * которые нужны чтобы привести его к состоянию `next`.
 *
 * Использование:
 *   const tpl = document.createElement("template");
 *   tpl.innerHTML = newHtml.trim();
 *   domPatch(existingElement, tpl.content.firstElementChild as Element);
 */

function patchAttrs(live: Element, next: Element): void {
  // Добавляем / обновляем атрибуты из next
  for (const { name, value } of Array.from(next.attributes)) {
    if (live.getAttribute(name) !== value) {
      live.setAttribute(name, value);
    }
  }
  // Удаляем атрибуты, которых нет в next
  for (const { name } of Array.from(live.attributes)) {
    if (!next.hasAttribute(name)) {
      live.removeAttribute(name);
    }
  }
}

function getKey(el: Element): string | null {
  return el.getAttribute("data-key") ?? el.getAttribute("data-id") ?? null;
}

function patchChildren(live: Element, next: Element): void {
  const liveChildren = Array.from(live.childNodes);
  const nextChildren = Array.from(next.childNodes);

  // Строим map живых keyed-элементов
  const liveKeyedMap = new Map<string, Element>();
  for (const child of liveChildren) {
    if (child instanceof Element) {
      const key = getKey(child);
      if (key) liveKeyedMap.set(key, child);
    }
  }

  let liveIdx = 0;

  for (const nextChild of nextChildren) {
    const currentLive = live.childNodes[liveIdx];

    // Текстовый узел
    if (nextChild.nodeType === Node.TEXT_NODE) {
      if (currentLive?.nodeType === Node.TEXT_NODE) {
        if (currentLive.textContent !== nextChild.textContent) {
          currentLive.textContent = nextChild.textContent;
        }
        liveIdx++;
      } else {
        live.insertBefore(nextChild.cloneNode(), currentLive ?? null);
        liveIdx++;
      }
      continue;
    }

    if (!(nextChild instanceof Element)) {
      liveIdx++;
      continue;
    }

    const nextKey = getKey(nextChild);

    // Если у элемента есть ключ — ищем его в существующем DOM
    if (nextKey) {
      const existing = liveKeyedMap.get(nextKey);
      if (existing) {
        // Перемещаем на нужную позицию если требуется
        if (existing !== currentLive) {
          live.insertBefore(existing, currentLive ?? null);
        }
        domPatch(existing, nextChild);
        liveKeyedMap.delete(nextKey);
        liveIdx++;
        continue;
      }
    }

    // Без ключа — сравниваем по позиции и тегу
    if (
      currentLive instanceof Element &&
      currentLive.tagName === nextChild.tagName &&
      !getKey(currentLive) // не трогаем keyed-элементы без совпадения
    ) {
      domPatch(currentLive, nextChild);
      liveIdx++;
    } else {
      // Теги не совпадают или нет живого узла — вставляем новый
      live.insertBefore(nextChild.cloneNode(true), currentLive ?? null);
      liveIdx++;
    }
  }

  // Удаляем лишние узлы в конце
  while (live.childNodes.length > nextChildren.length) {
    live.removeChild(live.lastChild!);
  }

  // Удаляем keyed-элементы, которых не было в next
  for (const orphan of liveKeyedMap.values()) {
    orphan.remove();
  }
}

export function domPatch(live: Element, next: Element): void {
  if (live.tagName !== next.tagName) {
    // Разные теги — полная замена (редкий случай)
    live.replaceWith(next.cloneNode(true));
    return;
  }

  patchAttrs(live, next);

  // Для листовых элементов с простым текстом — быстрый путь
  if (
    next.childNodes.length === 1 &&
    next.firstChild?.nodeType === Node.TEXT_NODE &&
    live.childNodes.length === 1 &&
    live.firstChild?.nodeType === Node.TEXT_NODE
  ) {
    if (live.firstChild!.textContent !== next.firstChild!.textContent) {
      live.firstChild!.textContent = next.firstChild!.textContent;
    }
    return;
  }

  patchChildren(live, next);
}
