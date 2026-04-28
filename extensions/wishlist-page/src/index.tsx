import { useState, useEffect, useCallback } from "react";
import {
  reactExtension,
  useApi,
  BlockStack,
  InlineStack,
  Image,
  Text,
  Button,
  Link,
  Spinner,
  Banner,
  View,
  Divider,
  Modal,
} from "@shopify/ui-extensions-react/customer-account";

const APP_URL =
  process.env.SHOPIFY_APP_URL ?? "https://web-production-7a9e1.up.railway.app";

interface WishlistItem {
  productId: string;
  productHandle: string;
  productTitle: string;
  productImage: string | null;
  productPrice: string | null;
  productUrl: string;
  variantId: string | null;
}

const CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart { id checkoutUrl }
      userErrors { message }
    }
  }
`;

const CART_LINES_ADD = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { id checkoutUrl }
      userErrors { message }
    }
  }
`;

function WishlistPage() {
  const { sessionToken, query } = useApi() as {
    sessionToken: { get: () => Promise<string> };
    query: <T>(q: string, opts?: { variables?: Record<string, unknown> }) => Promise<{ data?: T; errors?: unknown }>;
  };
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [modalAddedTitle, setModalAddedTitle] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await sessionToken.get();
      const res = await fetch(`${APP_URL}/account/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError("Could not load your wishlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  const removeItem = async (productId: string) => {
    setRemoving(productId);
    try {
      const token = await sessionToken.get();
      await fetch(`${APP_URL}/account/wishlist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "remove", productId }),
      });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } finally {
      setRemoving(null);
    }
  };

  const addToCart = async (item: WishlistItem) => {
    if (!item.variantId) return;
    setAdding(item.productId);
    try {
      const lines = [{ merchandiseId: item.variantId, quantity: 1 }];
      let result: { cart?: { id: string; checkoutUrl: string }; userErrors?: { message: string }[] } | undefined;

      if (cartId) {
        const res = await query<{ cartLinesAdd: typeof result }>(CART_LINES_ADD, {
          variables: { cartId, lines },
        });
        result = res.data?.cartLinesAdd;
      } else {
        const res = await query<{ cartCreate: typeof result }>(CART_CREATE, {
          variables: { lines },
        });
        result = res.data?.cartCreate;
      }

      if (result?.userErrors && result.userErrors.length > 0) {
        throw new Error(result.userErrors[0].message);
      }
      if (!result?.cart) throw new Error("no cart");

      setCartId(result.cart.id);
      setCheckoutUrl(result.cart.checkoutUrl);
      setModalAddedTitle(item.productTitle);
    } catch (e) {
      console.error("[wishlist] addToCart failed", e);
      setError("Could not add to cart. Please try again.");
    } finally {
      setAdding(null);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return (
      <View padding="base">
        <Spinner />
      </View>
    );
  }

  if (error) {
    return <Banner status="critical">{error}</Banner>;
  }

  if (items.length === 0) {
    return (
      <View padding="base">
        <Text tone="subdued">
          Your wishlist is empty. Browse products and tap the heart icon to save
          items.
        </Text>
      </View>
    );
  }

  return (
    <>
      <BlockStack spacing="none">
        {items.map((item, i) => (
          <View key={item.productId}>
            {i > 0 && <Divider />}
            <View padding="base">
              <InlineStack spacing="base" blockAlignment="center">
                {item.productImage && (
                  <View minInlineSize={72} maxInlineSize={72}>
                    <Image
                      source={item.productImage}
                      alt={item.productTitle}
                      aspectRatio={1}
                    />
                  </View>
                )}
                <View>
                  <BlockStack spacing="extraTight">
                    <Link to={item.productUrl}>
                      <Text emphasis="bold">{item.productTitle}</Text>
                    </Link>
                    {item.productPrice && (
                      <Text tone="subdued">{item.productPrice}</Text>
                    )}
                  </BlockStack>
                </View>
                <View>
                  <InlineStack spacing="base">
                    <Button
                      kind="secondary"
                      disabled={!item.variantId || adding === item.productId}
                      onPress={() => addToCart(item)}
                    >
                      {adding === item.productId ? "Adding…" : "Add to cart"}
                    </Button>
                    <Button
                      kind="plain"
                      disabled={removing === item.productId}
                      onPress={() => removeItem(item.productId)}
                    >
                      {removing === item.productId ? "Removing…" : "Remove"}
                    </Button>
                  </InlineStack>
                </View>
              </InlineStack>
            </View>
          </View>
        ))}
      </BlockStack>
      {modalAddedTitle && checkoutUrl && (
        <Modal
          id="zw-added-modal"
          title="Added to cart"
          onClose={() => setModalAddedTitle(null)}
        >
          <BlockStack spacing="base">
            <Text>{modalAddedTitle} was added to your cart.</Text>
            <InlineStack spacing="base">
              <Link to={checkoutUrl}>Checkout</Link>
              <Button kind="plain" onPress={() => setModalAddedTitle(null)}>
                Continue shopping
              </Button>
            </InlineStack>
          </BlockStack>
        </Modal>
      )}
    </>
  );
}

export default reactExtension("customer-account.page.render", () => (
  <WishlistPage />
));
