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
      status: "paid",
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const cashSales = orders
    .filter((order) => order.paymentMethod === "Tunai")
    .reduce((sum, order) => sum + order.total, 0);
  const qrisSales = orders
    .filter((order) => order.paymentMethod === "QRIS manual")
    .reduce((sum, order) => sum + order.total, 0);
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
        ["Jumlah transaksi", orders.length],
        ["Tunai", cashSales],
        ["QRIS manual", qrisSales],
      ],
    },
    {
      name: "Transaksi",
      rows: [
        [
          "No Transaksi",
          "Waktu",
          "Jenis",
          "Pembayaran",
          "Status",
          "Total",
          "Uang Diterima",
          "Kembalian",
          "Catatan",
        ],
        ...orders.map((order) => [
          order.orderNumber,
          formatOrderDate(order.createdAt),
          order.orderType,
          order.paymentMethod,
          order.status,
          order.total,
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

function formatFileDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
