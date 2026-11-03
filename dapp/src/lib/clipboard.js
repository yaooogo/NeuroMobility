export async function copyText(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }

  const fallbackCopyText = () => {
    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    const activeElement = document.activeElement;
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    textarea.style.fontSize = "16px";
    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      if (/ipad|iphone|ipod/i.test(globalThis.navigator?.userAgent || "")) {
        const range = document.createRange();
        range.selectNodeContents(textarea);
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, textarea.value.length);
      }

      return document.execCommand("copy");
    } finally {
      if (previousRange && selection) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
      }

      document.body.removeChild(textarea);

      if (activeElement instanceof HTMLElement) {
        activeElement.focus();
      }
    }
  };

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn("clipboard.writeText failed, falling back to execCommand copy", error);
    }
  }

  return fallbackCopyText();
}
