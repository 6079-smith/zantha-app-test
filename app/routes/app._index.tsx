import { useState, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  BlockStack,
  Banner,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const record = await prisma.message.findUnique({ where: { shop: session.shop } });
  return json({ message: record?.text ?? "" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const text = String(formData.get("message") ?? "");
  await prisma.message.upsert({
    where: { shop: session.shop },
    create: { shop: session.shop, text },
    update: { text },
  });
  return json({ ok: true });
};

export default function Index() {
  const { message: savedMessage } = useLoaderData<typeof loader>();
  const [message, setMessage] = useState(savedMessage);
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  const handleSave = useCallback(() => {
    submit({ message }, { method: "POST" });
  }, [message, submit]);

  return (
    <Page>
      <TitleBar title="Store Message" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Edit your storefront message</Text>
                <TextField
                  label="Message"
                  value={message}
                  onChange={setMessage}
                  multiline={4}
                  autoComplete="off"
                  helpText="This message will appear at /a/message on your store."
                />
                <Button variant="primary" onClick={handleSave} loading={isSaving}>
                  Save
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Preview URL</Text>
                <Banner>
                  <p>
                    After saving, your message will be visible at:<br />
                    <strong>https://zantha-dev.myshopify.com/a/message</strong>
                  </p>
                </Banner>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
