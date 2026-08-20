export const DATE_FILTERS = [
  { label: "All time", value: "all" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
] as const;

export type DateFilter = (typeof DATE_FILTERS)[number]["value"];

export type DateRange = {
  end?: string;
  label: string;
  start?: string;
  value: DateFilter;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateOnly(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getDateParts(date = new Date()) {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function isDateFilter(value: string): value is DateFilter {
  return DATE_FILTERS.some((filter) => filter.value === value);
}

export function getDateRange(value: DateFilter): DateRange {
  const today = getDateParts();

  if (value === "all") {
    return {
      label: "All time",
      value,
    };
  }

  if (value === "last_month") {
    const month = today.month === 1 ? 12 : today.month - 1;
    const year = today.month === 1 ? today.year - 1 : today.year;

    return {
      end: formatDateOnly(year, month, getDaysInMonth(year, month)),
      label: "Last month",
      start: formatDateOnly(year, month, 1),
      value,
    };
  }

  if (value === "this_year") {
    return {
      end: formatDateOnly(today.year, 12, 31),
      label: "This year",
      start: formatDateOnly(today.year, 1, 1),
      value,
    };
  }

  return {
    end: formatDateOnly(
      today.year,
      today.month,
      getDaysInMonth(today.year, today.month),
    ),
    label: "This month",
    start: formatDateOnly(today.year, today.month, 1),
    value,
  };
}

export function getTodayInputDate() {
  const today = getDateParts();
  return formatDateOnly(today.year, today.month, today.day);
}

export function isValidDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDisplayDate(dateOnly: string) {
  if (!isValidDateOnly(dateOnly)) {
    return dateOnly;
  }

  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}
