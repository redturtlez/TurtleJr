const USD_INPUT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
const MAX_WHOLE_DIGITS = 13;

export function parseUsdToCents(input: string): bigint {
  const normalized = input.trim();
  const match = USD_INPUT.exec(normalized);
  if (!match) throw new Error("Enter a dollar amount with no more than two decimal places");

  const [, sign = "", whole = "", fraction = ""] = match;
  const significantWhole = whole.replace(/^0+(?=\d)/, "");
  if (significantWhole.length > MAX_WHOLE_DIGITS) throw new Error("Amount is too large");

  const absoluteCents = BigInt(significantWhole) * BigInt(100) + BigInt(fraction.padEnd(2, "0") || "0");
  return sign === "-" ? -absoluteCents : absoluteCents;
}

export function centsToUsdInput(cents: string | bigint): string {
  const value = typeof cents === "bigint" ? cents : BigInt(cents);
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / BigInt(100);
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function formatUsdCents(cents: string | bigint): string {
  const value = typeof cents === "bigint" ? cents : BigInt(cents);
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = new Intl.NumberFormat("en-US").format(absolute / BigInt(100));
  const fraction = (absolute % BigInt(100)).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${whole}.${fraction}`;
}

export function sumCents(values: Iterable<string | bigint>): bigint {
  let total = BigInt(0);
  for (const value of values) total += typeof value === "bigint" ? value : BigInt(value);
  return total;
}
