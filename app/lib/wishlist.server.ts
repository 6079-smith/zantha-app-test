import prisma from "../db.server";

const GUEST_COOKIE = "wishlist_guest";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

export type WishlistOwner =
  | { type: "customer"; shop: string; customerId: string }
  | { type: "guest"; shop: string; guestToken: string };

export function readGuestToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setGuestTokenHeader(token: string): string {
  return `${GUEST_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${GUEST_COOKIE_MAX_AGE}; SameSite=None; Secure; HttpOnly`;
}

function newGuestToken(): string {
  return crypto.randomUUID();
}

export function ownerFromProxy(
  shop: string,
  customerId: string | null,
  guestToken: string | null,
): { owner: WishlistOwner; newGuestToken?: string } {
  if (customerId) {
    return { owner: { type: "customer", shop, customerId } };
  }
  if (guestToken) {
    return { owner: { type: "guest", shop, guestToken } };
  }
  const fresh = newGuestToken();
  return {
    owner: { type: "guest", shop, guestToken: fresh },
    newGuestToken: fresh,
  };
}

export async function getOrCreateWishlist(owner: WishlistOwner) {
  if (owner.type === "customer") {
    return prisma.wishlist.upsert({
      where: { shop_customerId: { shop: owner.shop, customerId: owner.customerId } },
      create: { shop: owner.shop, customerId: owner.customerId },
      update: {},
      include: { items: { orderBy: { addedAt: "desc" } } },
    });
  }
  return prisma.wishlist.upsert({
    where: { shop_guestToken: { shop: owner.shop, guestToken: owner.guestToken } },
    create: { shop: owner.shop, guestToken: owner.guestToken },
    update: {},
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
}

export async function findWishlist(owner: WishlistOwner) {
  if (owner.type === "customer") {
    return prisma.wishlist.findUnique({
      where: { shop_customerId: { shop: owner.shop, customerId: owner.customerId } },
      include: { items: { orderBy: { addedAt: "desc" } } },
    });
  }
  return prisma.wishlist.findUnique({
    where: { shop_guestToken: { shop: owner.shop, guestToken: owner.guestToken } },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
}
