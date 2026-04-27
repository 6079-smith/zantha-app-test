(() => {
  const PROXY_BASE = "/a/wishlist";

  function injectModal() {
    if (document.getElementById("zw-auth-modal")) return;
    const el = document.createElement("div");
    el.id = "zw-auth-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "zw-auth-modal-title");
    el.innerHTML = `
      <div id="zw-auth-backdrop"></div>
      <div id="zw-auth-box">
        <button id="zw-auth-close" aria-label="Close">&times;</button>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <h2 id="zw-auth-modal-title">Save to your wishlist</h2>
        <p>Create a free account or log in to save your favourite products and access them any time.</p>
        <div class="zw-auth-actions">
          <a id="zw-auth-register" href="/account/register" class="zw-btn-primary">Create an account</a>
          <a id="zw-auth-login" href="/account/login" class="zw-btn-secondary">Log in</a>
        </div>
      </div>`;
    el.style.cssText = "display:none;position:fixed;inset:0;z-index:99999;";
    document.body.appendChild(el);

    document.getElementById("zw-auth-backdrop").addEventListener("click", hideModal);
    document.getElementById("zw-auth-close").addEventListener("click", hideModal);
    document.addEventListener("keydown", function(e) { if (e.key === "Escape") hideModal(); });
  }

  function showModal(loginUrl, registerUrl) {
    var modal = document.getElementById("zw-auth-modal");
    if (!modal) return;
    if (loginUrl) document.getElementById("zw-auth-login").href = loginUrl;
    if (registerUrl) document.getElementById("zw-auth-register").href = registerUrl;
    modal.style.display = "block";
    document.getElementById("zw-auth-close").focus();
  }

  function hideModal() {
    var modal = document.getElementById("zw-auth-modal");
    if (modal) modal.style.display = "none";
  }

  async function loadInitialState(buttons) {
    try {
      const res = await fetch(`${PROXY_BASE}/items`, { credentials: "same-origin" });
      if (!res.ok) return; // unauthenticated or error — buttons stay in default state
      const data = await res.json();
      if (!data.authenticated) return;
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
      label.textContent = pressed
        ? btn.dataset.removeLabel || "Saved"
        : btn.dataset.addLabel || "Add to wishlist";
    }
    btn.setAttribute("aria-label", pressed
      ? btn.dataset.removeLabel || "Saved"
      : btn.dataset.addLabel || "Add to wishlist");
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

      if (res.status === 401) {
        showModal(btn.dataset.loginUrl, btn.dataset.registerUrl);
        return;
      }
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
    injectModal();
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
