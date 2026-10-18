export interface GoalAmounts {
  targetCents: string | bigint;
  allocatedCents: string | bigint;
  monthlyContributionCents: string | bigint;
}

function nonnegative(value: string | bigint, name: string): bigint {
  const cents = typeof value === "bigint" ? value : BigInt(value);
  if (cents < BigInt(0)) throw new Error(`${name} cannot be negative`);
  return cents;
}

function parseKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Date must use YYYY-MM-DD");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) throw new Error("Date is invalid");
  return date;
}

function addMonthsClamped(value: string, months: number): string {
  const date = parseKey(value);
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export interface GoalProgress {
  remainingCents: bigint;
  progressBasisPoints: number;
  monthsToGoal: number | null;
  estimatedCompletionDate: string | null;
}

export function calculateGoalProgress(goal: GoalAmounts, asOfDate: string): GoalProgress {
  const target = nonnegative(goal.targetCents, "Target");
  const allocated = nonnegative(goal.allocatedCents, "Allocation");
  const contribution = nonnegative(goal.monthlyContributionCents, "Monthly contribution");
  if (target === BigInt(0)) throw new Error("Target must be greater than zero");
  if (allocated > target) throw new Error("Allocation cannot exceed target");
  const remaining = target - allocated;
  const progressBasisPoints = Number((allocated * BigInt(10_000)) / target);
  if (remaining === BigInt(0)) return { remainingCents: remaining, progressBasisPoints, monthsToGoal: 0, estimatedCompletionDate: asOfDate };
  if (contribution === BigInt(0)) return { remainingCents: remaining, progressBasisPoints, monthsToGoal: null, estimatedCompletionDate: null };
  const months = Number((remaining + contribution - BigInt(1)) / contribution);
  return { remainingCents: remaining, progressBasisPoints, monthsToGoal: months, estimatedCompletionDate: addMonthsClamped(asOfDate, months) };
}

export interface GrowthSimulation {
  startingPrincipalCents: bigint;
  contributionPrincipalCents: bigint;
  totalPrincipalCents: bigint;
  estimatedInterestCents: bigint;
  endingBalanceCents: bigint;
}

/** Models end-of-month deposits using an effective annual yield and rounds once at the end. */
export function simulateSavingsGrowth(starting: string | bigint, monthlyContribution: string | bigint, annualRatePpm: number, months: number): GrowthSimulation {
  const startingPrincipal = nonnegative(starting, "Starting balance");
  const monthly = nonnegative(monthlyContribution, "Monthly contribution");
  if (!Number.isInteger(annualRatePpm) || annualRatePpm < 0 || annualRatePpm > 1_000_000) throw new Error("Annual rate is outside the supported range");
  if (!Number.isInteger(months) || months < 1 || months > 600) throw new Error("Horizon must be between 1 and 600 months");
  const contributions = monthly * BigInt(months);
  const totalPrincipal = startingPrincipal + contributions;
  if (startingPrincipal > BigInt(Number.MAX_SAFE_INTEGER) || contributions > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Simulation amount is too large");

  const monthlyRate = annualRatePpm === 0 ? 0 : Math.pow(1 + annualRatePpm / 1_000_000, 1 / 12) - 1;
  const growth = Math.pow(1 + monthlyRate, months);
  const futureStarting = Number(startingPrincipal) * growth;
  const futureContributions = monthlyRate === 0 ? Number(contributions) : Number(monthly) * ((growth - 1) / monthlyRate);
  const endingBalance = BigInt(Math.round(futureStarting + futureContributions));
  if (endingBalance > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Simulation result is too large");
  return {
    startingPrincipalCents: startingPrincipal,
    contributionPrincipalCents: contributions,
    totalPrincipalCents: totalPrincipal,
    estimatedInterestCents: endingBalance - totalPrincipal,
    endingBalanceCents: endingBalance,
  };
}
