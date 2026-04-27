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
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  return json({
    shop,
    storefrontUrl: `https://${shop}/a/wishlist`,
  });
};

export default function AdminIndex() {
  const { storefrontUrl } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Wishlist" />
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
                Wishlist data is stored on each customer's profile in Shopify (as a
                metafield), so it's portable and follows the customer.
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
