import { MyBookingsClient } from "./MyBookingsClient";

export default async function MyBookingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MyBookingsClient slug={slug} />;
}
