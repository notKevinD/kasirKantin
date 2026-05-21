import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PosApp } from "./pos-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <PosApp
      initialProducts={products.map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }))}
      initialOrders={orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
      }))}
      user={user}
    />
  );
}
