(() => {
  const PROXY_BASE = "/a/wishlist";

  async function loadInitialState(buttons) {
    try {
      const res = await fetch(`${PROXY_BASE}/items`, { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      const ids = new Set((data.items || []).map((i) => String(i.productId)));
      buttons.forEach((btn) => {
        if (ids.has(String(btn.dataset.productId))) setPressed(btn, true);
      });
    } catch (e) {
      console.warn("[wishlist] failed to load state", e);
    }
  }

  function setPressed(btn, pressed) {
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    const label = btn.querySelector(".zw-wishlist-label");
    if (label) {
      const newText = pressed
        ? btn.dataset.removeLabel || "Saved"
        : btn.dataset.addLabel || "Add to wishlist";
      label.textContent = newText;
    }
  }

  async function toggle(btn) {
    const productId = btn.dataset.productId;
    const isSaved = btn.getAttribute("aria-pressed") === "true";
    btn.setAttribute("aria-busy", "true");

    try {
      const res = await fetch(`${PROXY_BASE}/items`, {
        method: isSaved ? "DELETE" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productHandle: btn.dataset.productHandle,
          productTitle: btn.dataset.productTitle,
          productImage: btn.dataset.productImage,
          productPrice: btn.dataset.productPrice,
        }),
      });
      if (res.ok) setPressed(btn, !isSaved);
    } catch (e) {
      console.error("[wishlist] toggle failed", e);
    } finally {
      btn.removeAttribute("aria-busy");
    }
  }

  function init() {
    const buttons = document.querySelectorAll(".zw-wishlist-btn");
    if (buttons.length === 0) return;
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => toggle(btn));
    });
    loadInitialState(buttons);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
