import prisma from "../db.server";

export type WishlistOwner = { shop: string; customerId: string };

export function ownerFromProxy(
  shop: string,
  customerId: string | null,
): WishlistOwner | null {
  if (!customerId) return null;
  return { shop, customerId };
}

export async function getOrCreateWishlist(owner: WishlistOwner) {
  return prisma.wishlist.upsert({
    where: { shop_customerId: { shop: owner.shop, customerId: owner.customerId } },
    create: { shop: owner.shop, customerId: owner.customerId },
    update: {},
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
}

export async function findWishlist(owner: WishlistOwner) {
  return prisma.wishlist.findUnique({
    where: { shop_customerId: { shop: owner.shop, customerId: owner.customerId } },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
}
