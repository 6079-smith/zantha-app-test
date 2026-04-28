const NAMESPACE = "app--352686768129";
const KEY = "wishlist";
const TYPE = "list.product_reference";

type AdminClient = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export interface WishlistProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
}

export const customerGid = (id: string) => `gid://shopify/Customer/${id}`;
export const productGid = (id: string) =>
  id.startsWith("gid://") ? id : `gid://shopify/Product/${id}`;
export const numericId = (gid: string) => gid.split("/").pop()!;

export async function readWishlistGids(
  admin: AdminClient,
  customerId: string,
): Promise<string[]> {
  const res = await admin.graphql(
    `#graphql
    query GetWishlistGids($customerId: ID!) {
      customer(id: $customerId) {
        metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value }
      }
    }`,
    { variables: { customerId: customerGid(customerId) } },
  );
  const data = (await res.json()) as {
    data?: { customer?: { metafield?: { value?: string } | null } | null };
  };
  const value = data?.data?.customer?.metafield?.value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readWishlistProducts(
  admin: AdminClient,
  customerId: string,
): Promise<WishlistProduct[]> {
  const res = await admin.graphql(
    `#graphql
    query GetWishlistProducts($customerId: ID!) {
      customer(id: $customerId) {
        metafield(namespace: "${NAMESPACE}", key: "${KEY}") {
          references(first: 50) {
            nodes {
              ... on Product {
                id
                title
                handle
                featuredImage { url altText }
                priceRange { minVariantPrice { amount currencyCode } }
              }
            }
          }
        }
      }
    }`,
    { variables: { customerId: customerGid(customerId) } },
  );
  const data = (await res.json()) as {
    data?: {
      customer?: {
        metafield?: { references?: { nodes: WishlistProduct[] } } | null;
      } | null;
    };
  };
  return data?.data?.customer?.metafield?.references?.nodes ?? [];
}

async function setWishlist(
  admin: AdminClient,
  customerId: string,
  productGids: string[],
) {
  const res = await admin.graphql(
    `#graphql
    mutation SetWishlist($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            ownerId: customerGid(customerId),
            namespace: NAMESPACE,
            key: KEY,
            type: TYPE,
            value: JSON.stringify(productGids),
          },
        ],
      },
    },
  );
  const data = (await res.json()) as {
    data?: {
      metafieldsSet?: { userErrors?: Array<{ field: string[]; message: string }> };
    };
  };
  const errors = data?.data?.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0) {
    console.error("[wishlist] metafieldsSet errors:", errors);
    throw new Error(errors[0].message);
  }
}

export async function addToWishlist(
  admin: AdminClient,
  customerId: string,
  productId: string,
) {
  const pGid = productGid(productId);
  const current = await readWishlistGids(admin, customerId);
  if (current.includes(pGid)) return;
  await setWishlist(admin, customerId, [...current, pGid]);
}

export async function removeFromWishlist(
  admin: AdminClient,
  customerId: string,
  productId: string,
) {
  const pGid = productGid(productId);
  const current = await readWishlistGids(admin, customerId);
  const next = current.filter((gid) => gid !== pGid);
  if (next.length === current.length) return;
  await setWishlist(admin, customerId, next);
}
