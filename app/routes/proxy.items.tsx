import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  ownerFromProxy,
  readGuestToken,
  setGuestTokenHeader,
  getOrCreateWishlist,
  findWishlist,
} from "../lib/wishlist.server";

function appendCookie(headers: Headers, token?: string) {
  if (token) headers.append("Set-Cookie", setGuestTokenHeader(token));
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || null;
  const guestToken = readGuestToken(request);

  const { owner, newGuestToken } = ownerFromProxy(session.shop, customerId, guestToken);
  const wishlist = await findWishlist(owner);

  const headers = new Headers({ "Content-Type": "application/json" });
  appendCookie(headers, newGuestToken);

  return new Response(
    JSON.stringify({
      items: wishlist?.items ?? [],
      shareToken: wishlist?.shareToken ?? null,
    }),
    { headers },
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || null;
  const guestToken = readGuestToken(request);
  const { owner, newGuestToken } = ownerFromProxy(session.shop, customerId, guestToken);

  const body = await request.json().catch(() => ({}));
  const headers = new Headers({ "Content-Type": "application/json" });
  appendCookie(headers, newGuestToken);

  if (request.method === "POST") {
    const { productId, productHandle, productTitle, productImage, productPrice } = body as Record<string, string>;
    if (!productId || !productHandle || !productTitle) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400, headers });
    }
    const wishlist = await getOrCreateWishlist(owner);
    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      create: {
        wishlistId: wishlist.id,
        productId,
        productHandle,
        productTitle,
        productImage: productImage ?? null,
        productPrice: productPrice ?? null,
      },
      update: { productHandle, productTitle, productImage: productImage ?? null, productPrice: productPrice ?? null },
    });
    return new Response(JSON.stringify({ ok: true, shareToken: wishlist.shareToken }), { headers });
  }

  if (request.method === "DELETE") {
    const { productId } = body as Record<string, string>;
    if (!productId) {
      return new Response(JSON.stringify({ error: "missing_productId" }), { status: 400, headers });
    }
    const wishlist = await findWishlist(owner);
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    }
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
};
