import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PosApp } from "./pos-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const canManage = user.role === "owner" || user.role === "admin";
  const [
    products,
    categories,
    orders,
    users,
    auditLogs,
    currentShift,
    shiftHistory,
  ] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.order.findMany({
      include: { items: true, refunds: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    canManage
      ? prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.cashierShift.findFirst({
      where: { status: "open" },
      orderBy: { openedAt: "desc" },
      include: { orders: { include: { items: true, refunds: true } } },
    }),
    prisma.cashierShift.findMany({
      where: { status: "closed" },
      orderBy: { closedAt: "desc" },
      include: { orders: { include: { items: true, refunds: true } } },
      take: 50,
    }),
  ]);

  return (
    <PosApp
      initialProducts={products.map((product) => ({
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        category: {
          ...product.category,
          createdAt: product.category.createdAt.toISOString(),
          updatedAt: product.category.updatedAt.toISOString(),
        },
      }))}
      initialCategories={categories.map((category) => ({
        ...category,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      }))}
      initialOrders={orders.map((order) => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        refunds: order.refunds.map((refund) => ({
          ...refund,
          createdAt: refund.createdAt.toISOString(),
        })),
      }))}
      initialCurrentShift={
        currentShift
          ? {
              ...currentShift,
              openedAt: currentShift.openedAt.toISOString(),
              closedAt: currentShift.closedAt?.toISOString() ?? null,
              orders: currentShift.orders.map((order) => ({
                ...order,
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString(),
                refunds: order.refunds.map((refund) => ({
                  ...refund,
                  createdAt: refund.createdAt.toISOString(),
                })),
              })),
            }
          : null
      }
      initialShiftHistory={shiftHistory.map((shift) => ({
        ...shift,
        openedAt: shift.openedAt.toISOString(),
        closedAt: shift.closedAt?.toISOString() ?? null,
        orders: shift.orders.map((order) => ({
          ...order,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          refunds: order.refunds.map((refund) => ({
            ...refund,
            createdAt: refund.createdAt.toISOString(),
          })),
        })),
      }))}
      initialUsers={users.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
      initialAuditLogs={auditLogs.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      user={user}
    />
  );
}
