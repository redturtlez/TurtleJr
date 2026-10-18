import type { PlannedOccurrence } from "./recurrence";

export type AdvisorConfidence = "INCOMPLETE" | "READY" | "SHORTFALL";

export interface CheckingBufferInput {
  startingBalanceCents: string | bigint;
  occurrences: readonly PlannedOccurrence[];
  safetyBufferCents: string | bigint;
  manualIncomeCents: string | bigint;
  manualBillsCents: string | bigint;
  manualAllowanceCents: string | bigint;
  scheduleConfirmed: boolean;
}

export interface CheckingBufferResult {
  plannedIncomeCents: bigint;
  plannedOutflowCents: bigint;
  projectedEndCents: bigint;
  lowestProjectedCents: bigint;
  safeTransferCents: bigint;
  projectedLowAfterTransferCents: bigint;
  shortfallCents: bigint;
  confidence: AdvisorConfidence;
}

function nonnegativeCents(value: string | bigint, name: string): bigint {
  const cents = typeof value === "bigint" ? value : BigInt(value);
  if (cents < BigInt(0)) throw new Error(`${name} cannot be negative`);
  return cents;
}

export function calculateCheckingBuffer(input: CheckingBufferInput): CheckingBufferResult {
  const startingBalance = typeof input.startingBalanceCents === "bigint" ? input.startingBalanceCents : BigInt(input.startingBalanceCents);
  const safetyBuffer = nonnegativeCents(input.safetyBufferCents, "Safety buffer");
  const manualIncome = nonnegativeCents(input.manualIncomeCents, "Expected receipts");
  const manualBills = nonnegativeCents(input.manualBillsCents, "Expected bills");
  const manualAllowance = nonnegativeCents(input.manualAllowanceCents, "Discretionary allowance");
  let plannedIncome = BigInt(0);
  let plannedOutflow = BigInt(0);

  // Undated manual outflows are conservatively reserved at the start. Undated
  // receipts arrive only at the end, so they cannot inflate the safe transfer.
  let running = startingBalance - manualBills - manualAllowance;
  let lowest = running;
  const ordered = [...input.occurrences].sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name));
  for (const occurrence of ordered) {
    const amount = nonnegativeCents(occurrence.amountCents, "Planned amount");
    if (occurrence.kind === "INCOME") {
      plannedIncome += amount;
      running += amount;
    } else {
      plannedOutflow += amount;
      running -= amount;
    }
    if (running < lowest) lowest = running;
  }

  const projectedEnd = running + manualIncome;
  const shortfall = lowest < safetyBuffer ? safetyBuffer - lowest : BigInt(0);
  const safeTransfer = input.scheduleConfirmed && shortfall === BigInt(0) ? lowest - safetyBuffer : BigInt(0);
  return {
    plannedIncomeCents: plannedIncome,
    plannedOutflowCents: plannedOutflow,
    projectedEndCents: projectedEnd,
    lowestProjectedCents: lowest,
    safeTransferCents: safeTransfer,
    projectedLowAfterTransferCents: lowest - safeTransfer,
    shortfallCents: shortfall,
    confidence: !input.scheduleConfirmed ? "INCOMPLETE" : shortfall > BigInt(0) ? "SHORTFALL" : "READY",
  };
}

const APY_INPUT = /^(\d{1,3})(?:\.(\d{1,4}))?$/;

/** Parses a percent APY into parts per million of one (4.25% = 42,500 ppm). */
export function parseApyPercentToPpm(input: string): number {
  const match = APY_INPUT.exec(input.trim());
  if (!match) throw new Error("Enter an APY from 0% to 100% with up to four decimal places");
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(4, "0") || "0");
  const ppm = whole * 10_000 + fraction;
  if (ppm > 1_000_000) throw new Error("APY cannot exceed 100%");
  return ppm;
}

export interface ApyIllustration {
  principalCents: bigint;
  interestCents: bigint;
  endingBalanceCents: bigint;
  days: number;
}

/** Uses APY as an effective annual yield and rounds once, at the final cent. */
export function illustrateApy(principal: string | bigint, apyPpm: number, months: number): ApyIllustration {
  const principalCents = nonnegativeCents(principal, "Principal");
  if (principalCents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Principal is too large to illustrate safely");
  if (!Number.isInteger(apyPpm) || apyPpm < 0 || apyPpm > 1_000_000) throw new Error("APY is outside the supported range");
  if (!Number.isInteger(months) || months < 1 || months > 120) throw new Error("Horizon must be between 1 and 120 months");
  const days = Math.round((months * 365) / 12);
  const endingBalanceCents = BigInt(Math.round(Number(principalCents) * Math.pow(1 + apyPpm / 1_000_000, days / 365)));
  return { principalCents, interestCents: endingBalanceCents - principalCents, endingBalanceCents, days };
}
