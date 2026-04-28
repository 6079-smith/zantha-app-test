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

  // DEBUG: list all customer metafields to find the actual namespace
  const debugRes = await admin.graphql(
    `#graphql
    query ListCustomerMetafields($customerId: ID!) {
      customer(id: $customerId) {
        metafields(first: 20) {
          nodes { namespace key type value }
        }
      }
    }`,
    { variables: { customerId: `gid://shopify/Customer/${customerId}` } },
  );
  const debugData = await debugRes.json();

  console.log("[wishlist DEBUG]", {
    sub: sessionToken.sub,
    dest: sessionToken.dest,
    extractedShop: shop,
    extractedCustomerId: customerId,
    productCount: products.length,
    allMetafields: JSON.stringify(debugData?.data?.customer?.metafields?.nodes ?? []),
  });

  return cors(
    json({
      items: products.map((p) => ({
        productId: numericId(p.id),
        productHandle: p.handle,
        productTitle: p.title,
        productImage: p.featuredImage?.url ?? null,
        productPrice: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
      })),
    }),
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = shopFromDest(String(sessionToken.dest));
  const customerId = customerIdFromSub(String(sessionToken.sub));

  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const { productId } = body;
  if (!productId) return cors(json({ error: "missing_productId" }, { status: 400 }));

  const { admin } = await unauthenticated.admin(shop);

  if (request.method === "DELETE") {
    await removeFromWishlist(admin, customerId, productId);
    return cors(json({ ok: true }));
  }

  return cors(json({ error: "method_not_allowed" }, { status: 405 }));
};
