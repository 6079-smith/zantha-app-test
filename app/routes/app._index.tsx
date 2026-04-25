import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  List,
  Link,
  InlineStack,
  Box,
  Banner,
  IndexTable,
  Badge,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [wishlists, totalItems, totalSubs] = await Promise.all([
    prisma.wishlist.findMany({
      where: { shop },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: { _count: { select: { items: true } } },
    }),
    prisma.wishlistItem.count({ where: { wishlist: { shop } } }),
    prisma.backInStockSubscription.count({ where: { shop, notifiedAt: null } }),
  ]);

  return json({
    shop,
    storefrontUrl: `https://${shop}/a/wishlist`,
    stats: {
      totalWishlists: wishlists.length,
      totalItems,
      pendingNotifications: totalSubs,
    },
    wishlists: wishlists.map((w) => ({
      id: w.id,
      customerId: w.customerId,
      isGuest: !w.customerId,
      itemCount: w._count.items,
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
};

export default function AdminIndex() {
  const { storefrontUrl, stats, wishlists } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Wishlist" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Setup guide
                </Text>
                <List type="number">
                  <List.Item>
                    Go to your <strong>theme editor</strong> and open a product page.
                  </List.Item>
                  <List.Item>
                    Click <strong>Add block</strong> on the product template, find{" "}
                    <strong>Wishlist button</strong> under "Apps", and add it.
                  </List.Item>
                  <List.Item>
                    Save the theme. Customers will now see a heart button on product pages.
                  </List.Item>
                  <List.Item>
                    Customers can view their saved items at{" "}
                    <Link url={storefrontUrl} target="_blank" removeUnderline>
                      {storefrontUrl}
                    </Link>{" "}
                    or via the customer account area.
                  </List.Item>
                </List>
                <Banner tone="info">
                  Guest shoppers get a wishlist tied to their browser. Logged-in customers
                  keep their wishlist across devices.
                </Banner>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  At a glance
                </Text>
                <InlineStack gap="600">
                  <Box>
                    <Text as="p" variant="headingLg">
                      {stats.totalWishlists}
                    </Text>
                    <Text as="p" tone="subdued">
                      Wishlists
                    </Text>
                  </Box>
                  <Box>
                    <Text as="p" variant="headingLg">
                      {stats.totalItems}
                    </Text>
                    <Text as="p" tone="subdued">
                      Items saved
                    </Text>
                  </Box>
                  <Box>
                    <Text as="p" variant="headingLg">
                      {stats.pendingNotifications}
                    </Text>
                    <Text as="p" tone="subdued">
                      Stock alerts
                    </Text>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card padding="0">
              <Box padding="400" paddingBlockEnd="200">
                <Text as="h2" variant="headingMd">
                  Recent wishlists
                </Text>
              </Box>
              {wishlists.length === 0 ? (
                <EmptyState
                  heading="No wishlists yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>
                    Once shoppers start saving products, their wishlists will appear here.
                  </p>
                </EmptyState>
              ) : (
                <IndexTable
                  resourceName={{ singular: "wishlist", plural: "wishlists" }}
                  itemCount={wishlists.length}
                  selectable={false}
                  headings={[
                    { title: "Customer" },
                    { title: "Items" },
                    { title: "Last updated" },
                  ]}
                >
                  {wishlists.map((w, i) => (
                    <IndexTable.Row id={w.id} key={w.id} position={i}>
                      <IndexTable.Cell>
                        {w.isGuest ? (
                          <Badge tone="info">Guest</Badge>
                        ) : (
                          <Text as="span">Customer #{w.customerId}</Text>
                        )}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span">{w.itemCount}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued">
                          {new Date(w.updatedAt).toLocaleString()}
                        </Text>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

