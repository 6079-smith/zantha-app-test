import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getOrCreateWishlist, findWishlist } from "../lib/wishlist.server";

function customerIdFromSub(sub: string): string {
  // sub is "gid://shopify/Customer/123456789" or a plain numeric string
  return sub.split("/").pop()!;
}

function shopFromDest(dest: string): string {
  return dest.replace(/^https?:\/\//, "");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = shopFromDest(String(sessionToken.dest));
  const customerId = customerIdFromSub(String(sessionToken.sub));

  const wishlist = await findWishlist({ shop, customerId });
  return cors(
    json({
      shop: String(sessionToken.dest),
      items: wishlist?.items ?? [],
      shareToken: wishlist?.shareToken ?? null,
    }),
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { sessionToken, cors } = await authenticate.public.customerAccount(request);
  const shop = shopFromDest(String(sessionToken.dest));
  const customerId = customerIdFromSub(String(sessionToken.sub));
  const owner = { shop, customerId };

  const body = await request.json().catch(() => ({}));

  if (request.method === "POST") {
    const { productId, productHandle, productTitle, productImage, productPrice } =
      body as Record<string, string>;
    if (!productId || !productHandle || !productTitle) {
      return cors(json({ error: "missing_fields" }, { status: 400 }));
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
    return cors(json({ ok: true }));
  }

  if (request.method === "DELETE") {
    const { productId } = body as Record<string, string>;
    if (!productId) return cors(json({ error: "missing_productId" }, { status: 400 }));
    const wishlist = await findWishlist(owner);
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, productId },
      });
    }
    return cors(json({ ok: true }));
  }

  return cors(json({ error: "method_not_allowed" }, { status: 405 }));
};
