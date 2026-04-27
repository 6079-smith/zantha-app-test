import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  readWishlistGids,
  addToWishlist,
  removeFromWishlist,
  numericId,
} from "../lib/wishlist.server";

const UNAUTHENTICATED = json({ authenticated: false }, { status: 401 });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  if (!customerId) return UNAUTHENTICATED;

  const gids = await readWishlistGids(admin, customerId);
  return json({
    authenticated: true,
    items: gids.map((gid) => ({ productId: numericId(gid) })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) return json({ error: "no_session" }, { status: 400 });

  const url = new URL(request.url);
  const customerId = url.searchParams.get("logged_in_customer_id");
  if (!customerId) return UNAUTHENTICATED;

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const { productId } = body;
  if (!productId) return json({ error: "missing_productId" }, { status: 400 });

  if (request.method === "POST") {
    await addToWishlist(admin, customerId, productId);
    return json({ ok: true });
  }

  if (request.method === "DELETE") {
    await removeFromWishlist(admin, customerId, productId);
    return json({ ok: true });
  }

  return json({ error: "method_not_allowed" }, { status: 405 });
};
