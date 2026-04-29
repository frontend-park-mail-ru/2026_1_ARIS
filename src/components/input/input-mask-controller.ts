/**
 * Форматирует сырую строку даты в вид `dd/mm/yyyy`.
 *
 * @param {string} digits Последовательность цифр без разделителей.
 * @returns {string} Дата в пользовательском формате.
 */
function formatDateDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 8);

  if (clean.length <= 2) {
    return clean;
  }

  if (clean.length <= 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }

  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

/**
 * Применяет маску даты к полю ввода.
 */
function handleDateMaskInput(input: HTMLInputElement): void {
  const digitsOnly = input.value.replace(/\D/g, "").slice(0, 8);
  input.value = formatDateDigits(digitsOnly);
}

/**
 * Ограничивает ввод клавиш для поля с маской даты.
 */
function handleDateMaskKeyDown(event: KeyboardEvent, input: HTMLInputElement): void {
  const allowedKeys = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Home",
    "End",
  ];

  if (allowedKeys.includes(event.key)) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }

  const digitsCount = input.value.replace(/\D/g, "").length;
  const hasSelection = input.selectionStart !== input.selectionEnd;

  if (digitsCount >= 8 && !hasSelection) {
    event.preventDefault();
  }
}

/**
 * Обрабатывает вставку в поле с маской даты.
 */
function handleDateMaskPaste(event: ClipboardEvent, input: HTMLInputElement): void {
  event.preventDefault();

  const pastedText = event.clipboardData?.getData("text") ?? "";
  const digitsOnly = pastedText.replace(/\D/g, "");

  const currentDigits = input.value.replace(/\D/g, "");
  const nextDigits = (currentDigits + digitsOnly).slice(0, 8);

  input.value = formatDateDigits(nextDigits);
}

type MaskRoot = (Document | HTMLElement) & {
  __inputMasksBound?: boolean;
};

/**
 * Инициализирует маски ввода внутри указанного корня.
 *
 * @param {Document | HTMLElement} [root=document] Корень для делегированных обработчиков.
 * @returns {void}
 */
export function initInputMasks(root: Document | HTMLElement = document): void {
  const bindableRoot = root as MaskRoot;
  if (bindableRoot.__inputMasksBound) return;

  root.addEventListener("keydown", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskKeyDown(event as KeyboardEvent, target);
  });

  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskInput(target);
  });

  root.addEventListener("paste", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskPaste(event as ClipboardEvent, target);
  });

  bindableRoot.__inputMasksBound = true;
}
