import { useState, useEffect, useCallback } from "react";
import {
  reactExtension,
  useApi,
  BlockStack,
  InlineStack,
  Image,
  Text,
  Button,
  Spinner,
  Banner,
  View,
  Divider,
} from "@shopify/ui-extensions-react/customer-account";

const APP_URL =
  process.env.SHOPIFY_APP_URL ?? "https://web-production-7a9e1.up.railway.app";

interface WishlistItem {
  productId: string;
  productHandle: string;
  productTitle: string;
  productImage: string | null;
  productPrice: string | null;
}

function WishlistPage() {
  const { sessionToken } = useApi();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

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
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } finally {
      setRemoving(null);
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
                  <Text emphasis="bold">{item.productTitle}</Text>
                  {item.productPrice && (
                    <Text tone="subdued">{item.productPrice}</Text>
                  )}
                </BlockStack>
              </View>
              <View>
                <Button
                  kind="plain"
                  disabled={removing === item.productId}
                  onPress={() => removeItem(item.productId)}
                >
                  {removing === item.productId ? "Removing…" : "Remove"}
                </Button>
              </View>
            </InlineStack>
          </View>
        </View>
      ))}
    </BlockStack>
  );
}

export default reactExtension("customer-account.page.render", () => (
  <WishlistPage />
));
