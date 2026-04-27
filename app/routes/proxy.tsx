import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ownerFromProxy, findWishlist } from "../lib/wishlist.server";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 1000px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; }
  h1 { font-size: 1.75rem; margin-bottom: 1.5rem; }
`;

function loginCta(loginUrl: string, registerUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Wishlist</title>
  <style>
    ${BASE_STYLES}
    .cta-box { text-align: center; padding: 4rem 2rem; background: #fafafa; border: 1px solid #e6e6e6; border-radius: 12px; margin-top: 1rem; }
    .cta-box svg { width: 3rem; height: 3rem; color: #dc2626; margin-bottom: 1.25rem; }
    .cta-box h2 { font-size: 1.4rem; margin: 0 0 0.75rem; }
    .cta-box p { color: #555; margin: 0 0 2rem; max-width: 420px; margin-left: auto; margin-right: auto; }
    .cta-actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    .btn-primary { background: #1a1a1a; color: #fff; text-decoration: none; padding: 0.7rem 1.5rem; border-radius: 4px; font-size: 0.95rem; font-weight: 500; }
    .btn-secondary { background: transparent; color: #1a1a1a; text-decoration: none; padding: 0.7rem 1.5rem; border-radius: 4px; font-size: 0.95rem; font-weight: 500; border: 1px solid #1a1a1a; }
    .btn-primary:hover { background: #333; }
    .btn-secondary:hover { background: #f4f4f4; }
  </style>
</head>
<body>
  <h1>My Wishlist</h1>
  <div class="cta-box">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
    <h2>Save the things you love</h2>
    <p>Create a free account or log in to start saving products to your wishlist and keep track of your favourites.</p>
    <div class="cta-actions">
      <a href="${escapeHtml(registerUrl)}" class="btn-primary">Create an account</a>
      <a href="${escapeHtml(loginUrl)}" class="btn-secondary">Log in</a>
    </div>
  </div>
</body>
</html>`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return new Response("Unauthorized", { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || null;

  if (!customerId) {
    const origin = url.origin;
    return new Response(
      loginCta(`${origin}/account/login`, `${origin}/account/register`),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  const owner = ownerFromProxy(session.shop, customerId)!;
  const wishlist = await findWishlist(owner);
  const items = wishlist?.items ?? [];

  const itemsHtml = items
    .map(
      (item) => `
      <li class="wishlist-item" data-product-id="${escapeHtml(item.productId)}">
        ${item.productImage ? `<img src="${escapeHtml(item.productImage)}" alt="" />` : '<div class="placeholder"></div>'}
        <div class="info">
          <a href="/products/${escapeHtml(item.productHandle)}" class="title">${escapeHtml(item.productTitle)}</a>
          ${item.productPrice ? `<div class="price">${escapeHtml(item.productPrice)}</div>` : ""}
        </div>
        <button class="remove" data-product-id="${escapeHtml(item.productId)}">Remove</button>
      </li>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Wishlist</title>
  <style>
    ${BASE_STYLES}
    .empty { color: #666; padding: 3rem 0; text-align: center; }
    ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
    .wishlist-item { background: #fff; border: 1px solid #e6e6e6; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .wishlist-item img, .placeholder { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; background: #f4f4f4; }
    .info { flex: 1; }
    .title { color: #1a1a1a; text-decoration: none; font-weight: 500; display: block; margin-bottom: 0.25rem; }
    .title:hover { text-decoration: underline; }
    .price { color: #666; font-size: 0.95rem; }
    .remove { background: none; border: 1px solid #ccc; padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .remove:hover { background: #f4f4f4; }
    .share { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #eee; }
    .share button { background: #1a1a1a; color: #fff; border: 0; padding: 0.6rem 1rem; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>My Wishlist</h1>
  ${
    items.length === 0
      ? `<p class="empty">Your wishlist is empty. Browse products and tap the heart to save them.</p>`
      : `<ul>${itemsHtml}</ul>
         <div class="share">
           <p>Share this wishlist:</p>
           <button id="share-btn" data-token="${escapeHtml(wishlist?.shareToken ?? "")}">Copy share link</button>
         </div>`
  }
  <script>
    document.querySelectorAll('.remove').forEach(function(btn) {
      btn.addEventListener('click', async function(e) {
        var productId = e.target.dataset.productId;
        await fetch('/a/wishlist/items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: productId }),
        });
        location.reload();
      });
    });
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        var url = window.location.origin + '/a/wishlist/share/' + shareBtn.dataset.token;
        navigator.clipboard.writeText(url);
        shareBtn.textContent = 'Copied!';
        setTimeout(function() { shareBtn.textContent = 'Copy share link'; }, 2000);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html" } });
};
