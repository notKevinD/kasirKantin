import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/api-auth";
import { formatOrderDate } from "@/lib/format";
import {
  getReportRangeWindow,
  normalizeReportRange,
  reportRanges,
} from "@/lib/report-range";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReportOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;

export async function GET(request: Request) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const range = normalizeReportRange(url.searchParams.get("range"));
  const rangeLabel =
    reportRanges.find((item) => item.id === range)?.label ?? "Hari ini";
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const { start, end } = getReportRangeWindow(range, new Date(), {
    startDate,
    endDate,
  });
  const periodLabel =
    range === "custom" && startDate && endDate
      ? `${startDate} s/d ${endDate}`
      : rangeLabel;

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["paid", "partially_refunded", "refunded"] },
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const totalSales = orders.reduce((sum, order) => sum + netOrderTotal(order), 0);
  const discountTotal = orders.reduce((sum, order) => sum + order.discount, 0);
  const refundTotal = orders.reduce((sum, order) => sum + order.refundAmount, 0);
  const cashSales = orders
    .filter((order) => order.paymentMethod === "Tunai")
    .reduce((sum, order) => sum + netOrderTotal(order), 0);
  const qrisSales = orders
    .filter((order) => order.paymentMethod === "QRIS manual")
    .reduce((sum, order) => sum + netOrderTotal(order), 0);
  const transferSales = sumPayment(orders, "Transfer");
  const debitSales = sumPayment(orders, "Debit");
  const ewalletSales = sumPayment(orders, "E-Wallet");
  const splitSales = sumPayment(orders, "Split payment");
  const voidCount = await prisma.order.count({
    where: {
      status: "cancelled",
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });
  const soldProducts = getSoldProducts(orders);

  const workbook = createExcelXml([
    {
      name: "Ringkasan",
      rows: [
        ["Keterangan", "Nilai"],
        ["Periode", periodLabel],
        ["Mulai", formatOrderDate(start)],
        ["Sampai", formatOrderDate(new Date(end.getTime() - 1))],
        ["Total penjualan", totalSales],
        ["Total diskon", discountTotal],
        ["Total refund", refundTotal],
        ["Jumlah transaksi", orders.length],
        ["Void", voidCount],
        ["Tunai", cashSales],
        ["QRIS manual", qrisSales],
        ["Transfer", transferSales],
        ["Debit", debitSales],
        ["E-Wallet", ewalletSales],
        ["Split payment", splitSales],
      ],
    },
    {
      name: "Transaksi",
      rows: [
        [
          "No Transaksi",
          "No Antrean",
          "Waktu",
          "Jenis",
          "Pembayaran",
          "Status",
          "Meja",
          "Pelanggan",
          "Kasir",
          "Tipe Diskon",
          "Nilai Diskon",
          "Alasan Diskon",
          "Diskon",
          "Refund",
          "Alasan Refund",
          "Total",
          "Total Bersih",
          "Uang Diterima",
          "Kembalian",
          "Catatan",
        ],
        ...orders.map((order) => [
          order.orderNumber,
          order.queueNumber ?? "",
          formatOrderDate(order.createdAt),
          order.orderType,
          order.paymentMethod,
          order.status,
          order.tableNumber ?? "",
          order.customerName ?? "",
          order.cashierName ?? "",
          order.discountType,
          order.discountValue,
          order.discountReason ?? "",
          order.discount,
          order.refundAmount,
          order.refundReason ?? "",
          order.total,
          netOrderTotal(order),
          order.cashReceived ?? "",
          order.changeAmount ?? "",
          order.note ?? "",
        ]),
      ],
    },
    {
      name: "Detail Item",
      rows: [
        ["No Transaksi", "Waktu", "Menu", "Harga", "Jumlah", "Subtotal", "Catatan"],
        ...orders.flatMap((order) =>
          order.items.map((item) => [
            order.orderNumber,
            formatOrderDate(order.createdAt),
            item.productName,
            item.unitPrice,
            item.quantity,
            item.subtotal,
            item.note ?? "",
          ]),
        ),
      ],
    },
    {
      name: "Menu Terjual",
      rows: [
        ["Menu", "Jumlah Laku", "Total Penjualan"],
        ...soldProducts.map((product) => [
          product.name,
          product.quantity,
          product.total,
        ]),
      ],
    },
  ]);
  const fileName = `joyful-laporan-${range}-${formatFileDate(new Date())}.xls`;

  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function createExcelXml(
  sheets: { name: string; rows: (string | number)[][] }[],
) {
  const worksheets = sheets
    .map(
      (sheet) => `
    <Worksheet ss:Name="${escapeXml(sheet.name)}">
      <Table>
        ${sheet.rows
          .map(
            (row) => `
        <Row>
          ${row
            .map((cell) => {
              const isNumber = typeof cell === "number";
              return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(
                String(cell),
              )}</Data></Cell>`;
            })
            .join("")}
        </Row>`,
          )
          .join("")}
      </Table>
    </Worksheet>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  ${worksheets}
</Workbook>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getSoldProducts(orders: ReportOrder[]) {
  const map = new Map<string, { name: string; quantity: number; total: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = map.get(item.productName) ?? {
        name: item.productName,
        quantity: 0,
        total: 0,
      };

      current.quantity += item.quantity;
      current.total += item.subtotal;
      map.set(item.productName, current);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return b.total - a.total;
  });
}

function netOrderTotal(order: ReportOrder) {
  return Math.max(order.total - order.refundAmount, 0);
}

function sumPayment(orders: ReportOrder[], method: string) {
  return orders
    .filter((order) => order.paymentMethod === method)
    .reduce((sum, order) => sum + netOrderTotal(order), 0);
}

function formatFileDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
