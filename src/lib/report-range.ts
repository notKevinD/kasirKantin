export type ReportRange =
  | "today"
  | "yesterday"
  | "7days"
  | "14days"
  | "30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom";

export const reportRanges: { id: ReportRange; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "7days", label: "7 hari" },
  { id: "14days", label: "14 hari" },
  { id: "30days", label: "30 hari" },
  { id: "thisMonth", label: "Bulan ini" },
  { id: "lastMonth", label: "Bulan lalu" },
  { id: "thisYear", label: "Tahun ini" },
  { id: "lastYear", label: "Tahun lalu" },
  { id: "custom", label: "Custom" },
];

export function getReportRangeWindow(
  range: ReportRange,
  now = new Date(),
  custom?: { startDate?: string; endDate?: string },
) {
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  if (range === "today") {
    return { start: todayStart, end: tomorrowStart };
  }

  if (range === "yesterday") {
    return { start: addDays(todayStart, -1), end: todayStart };
  }

  if (range === "thisMonth") {
    return {
      start: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
      end: tomorrowStart,
    };
  }

  if (range === "lastMonth") {
    return {
      start: new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1),
      end: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
    };
  }

  if (range === "thisYear") {
    return {
      start: new Date(todayStart.getFullYear(), 0, 1),
      end: tomorrowStart,
    };
  }

  if (range === "lastYear") {
    return {
      start: new Date(todayStart.getFullYear() - 1, 0, 1),
      end: new Date(todayStart.getFullYear(), 0, 1),
    };
  }

  if (range === "custom") {
    const start = parseDateInput(custom?.startDate) ?? todayStart;
    const end = addDays(parseDateInput(custom?.endDate) ?? start, 1);
    return start <= end ? { start, end } : { start: end, end: addDays(start, 1) };
  }

  const days = range === "7days" ? 7 : range === "14days" ? 14 : 30;
  return { start: addDays(todayStart, -(days - 1)), end: tomorrowStart };
}

export function normalizeReportRange(value: string | null): ReportRange {
  if (
    value === "today" ||
    value === "yesterday" ||
    value === "7days" ||
    value === "14days" ||
    value === "30days" ||
    value === "thisMonth" ||
    value === "lastMonth" ||
    value === "thisYear" ||
    value === "lastYear" ||
    value === "custom"
  ) {
    return value;
  }

  return "today";
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
