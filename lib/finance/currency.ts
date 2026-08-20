const CURRENCY_LOCALES: Record<string, string> = {
  NGN: "en-NG",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const CENTS_PER_UNIT = BigInt(100);
const ZERO_CENTS = BigInt(0);

export function normalizeDecimal(value: number | string | null | undefined) {
  const rawValue =
    typeof value === "number"
      ? Number.isFinite(value)
        ? value.toFixed(2)
        : "0.00"
      : value?.trim() ?? "";

  if (!/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    return "0.00";
  }

  const isNegative = rawValue.startsWith("-");
  const unsignedValue = isNegative ? rawValue.slice(1) : rawValue;
  const [whole = "0", fraction = ""] = unsignedValue.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = `${fraction}00`.slice(0, 2);

  return `${isNegative ? "-" : ""}${normalizedWhole}.${normalizedFraction}`;
}

function decimalToCents(value: number | string) {
  const normalizedValue =
    typeof value === "number" ? value.toFixed(2) : value.trim();
  const isNegative = normalizedValue.startsWith("-");
  const unsignedValue = isNegative ? normalizedValue.slice(1) : normalizedValue;
  const [whole = "0", fraction = ""] = unsignedValue.split(".");
  const cents = `${fraction}00`.slice(0, 2);
  const total =
    BigInt(whole || "0") * CENTS_PER_UNIT + BigInt(cents || "0");

  return isNegative ? -total : total;
}

export function subtractCurrencyAmounts(
  minuend: number | string,
  subtrahend: number | string,
) {
  const difference = decimalToCents(minuend) - decimalToCents(subtrahend);
  const isNegative = difference < ZERO_CENTS;
  const absoluteDifference = isNegative ? -difference : difference;
  const whole = absoluteDifference / CENTS_PER_UNIT;
  const fraction = (absoluteDifference % CENTS_PER_UNIT)
    .toString()
    .padStart(2, "0");

  return `${isNegative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function formatCurrency(amount: number | string, currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();

  try {
    const normalizedAmount = normalizeDecimal(amount);
    const isNegative = normalizedAmount.startsWith("-");
    const unsignedAmount = isNegative
      ? normalizedAmount.slice(1)
      : normalizedAmount;
    const [whole = "0", fraction = "00"] = unsignedAmount.split(".");
    const formatter = new Intl.NumberFormat(
      CURRENCY_LOCALES[normalizedCurrency] ?? "en",
      {
        currency: normalizedCurrency,
        currencyDisplay: "symbol",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
      },
    );
    let parts = formatter.formatToParts(
      isNegative && whole === "0"
        ? BigInt(-1)
        : (isNegative ? BigInt(-1) : BigInt(1)) * BigInt(whole),
    );

    if (isNegative && whole === "0") {
      let replacedInteger = false;
      parts = parts.map((part) => {
        if (part.type === "integer" && !replacedInteger) {
          replacedInteger = true;
          return { ...part, value: "0" };
        }

        return part;
      });
    }

    return parts
      .map((part) => (part.type === "fraction" ? fraction : part.value))
      .join("");
  } catch {
    return `${normalizedCurrency} ${normalizeDecimal(amount)}`;
  }
}
