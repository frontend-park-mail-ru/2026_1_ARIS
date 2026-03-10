function formatDateDigits(digits) {
  const clean = digits.replace(/\D/g, "").slice(0, 8);

  if (clean.length <= 2) {
    return clean;
  }

  if (clean.length <= 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }

  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`;
}

function handleDateMaskInput(input) {
  const digitsOnly = input.value.replace(/\D/g, "").slice(0, 8);
  input.value = formatDateDigits(digitsOnly);
}

function handleDateMaskKeyDown(event, input) {
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

function handleDateMaskPaste(event, input) {
  event.preventDefault();

  const pastedText = event.clipboardData?.getData("text") ?? "";
  const digitsOnly = pastedText.replace(/\D/g, "");

  const currentDigits = input.value.replace(/\D/g, "");
  const nextDigits = (currentDigits + digitsOnly).slice(0, 8);

  input.value = formatDateDigits(nextDigits);
}

export function initInputMasks(root = document) {
  if (root.__inputMasksBound) return;

  root.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskKeyDown(event, target);
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskInput(target);
  });

  root.addEventListener("paste", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.dataset.mask !== "date") return;

    handleDateMaskPaste(event, target);
  });

  root.__inputMasksBound = true;
}
