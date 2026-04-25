import type { LoaderFunctionArgs } from "@remix-run/node";
import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await unauthenticated.appProxy(request);
  const shop = session?.shop ?? new URL(request.url).searchParams.get("shop") ?? "";
  const record = shop ? await prisma.message.findUnique({ where: { shop } }) : null;
  const text = record?.text || "No message has been set yet.";

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Store Message</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 800px; margin: 3rem auto; padding: 0 1.5rem; color: #1a1a1a; }
    h1 { font-size: 1.75rem; margin-bottom: 1rem; }
    p { font-size: 1.1rem; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Store Message</h1>
  <p>${escaped}</p>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
};
