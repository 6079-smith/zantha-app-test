import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";
import {
  readWishlistProducts,
  removeFromWishlist,
  numericId,
} from "../lib/wishlist.server";

const customerIdFromSub = (sub: string) => sub.split("/").pop()!;
const shopFromDest = (dest: string) => dest.replace(/^https?:\/\//, "");

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = shopFromDest(String(sessionToken.dest));
  const customerId = customerIdFromSub(String(sessionToken.sub));

  const { admin } = await unauthenticated.admin(shop);
  const products = await readWishlistProducts(admin, customerId);
  const shopOrigin = `https://${shop}`;

  return cors(
    json({
      items: products.map((p) => {
        const variantId = p.variants.nodes[0]?.id ?? null;
        return {
          productId: numericId(p.id),
          productHandle: p.handle,
          productTitle: p.title,
          productImage: p.featuredImage?.url ?? null,
          productPrice: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
          productUrl: `${shopOrigin}/products/${p.handle}`,
          variantId,
        };
      }),
    }),
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = shopFromDest(String(sessionToken.dest));
  const customerId = customerIdFromSub(String(sessionToken.sub));

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const { action: bodyAction, productId } = body;
  if (!productId) return cors(json({ error: "missing_productId" }, { status: 400 }));

  const { admin } = await unauthenticated.admin(shop);

  if (bodyAction === "remove") {
    await removeFromWishlist(admin, customerId, productId);
    return cors(json({ ok: true }));
  }

  return cors(json({ error: "unknown_action" }, { status: 400 }));
};
