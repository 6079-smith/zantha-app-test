import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  ownerFromProxy,
  getOrCreateWishlist,
  findWishlist,
} from "../lib/wishlist.server";

const UNAUTHENTICATED = json({ authenticated: false }, { status: 401 });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || null;
  const owner = ownerFromProxy(session.shop, customerId);
  if (!owner) return UNAUTHENTICATED;

  const wishlist = await findWishlist(owner);
  return json({
    authenticated: true,
    items: wishlist?.items ?? [],
    shareToken: wishlist?.shareToken ?? null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id") || null;
  const owner = ownerFromProxy(session.shop, customerId);
  if (!owner) return UNAUTHENTICATED;

  const body = await request.json().catch(() => ({}));

  if (request.method === "POST") {
    const { productId, productHandle, productTitle, productImage, productPrice } =
      body as Record<string, string>;
    if (!productId || !productHandle || !productTitle) {
      return json({ error: "missing_fields" }, { status: 400 });
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
      update: {
        productHandle,
        productTitle,
        productImage: productImage ?? null,
        productPrice: productPrice ?? null,
      },
    });
    return json({ ok: true, shareToken: wishlist.shareToken });
  }

  if (request.method === "DELETE") {
    const { productId } = body as Record<string, string>;
    if (!productId) return json({ error: "missing_productId" }, { status: 400 });
    const wishlist = await findWishlist(owner);
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    }
    return json({ ok: true });
  }

  return json({ error: "method_not_allowed" }, { status: 405 });
};
