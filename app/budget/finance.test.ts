import assert from "node:assert/strict";
import test from "node:test";
import { centsToUsdInput, formatUsdCents, parseUsdToCents, sumCents } from "../../lib/finance/money.ts";
import { generateOccurrences, summarizePlanned, type RecurringPlan } from "../../lib/finance/recurrence.ts";
import { summarizeRecorded } from "../../lib/finance/transactions.ts";
import { calculateCheckingBuffer, illustrateApy, parseApyPercentToPpm } from "../../lib/finance/advisor.ts";
import { calculateGoalProgress, simulateSavingsGrowth } from "../../lib/finance/goals.ts";
import { buildCashHistory, fundingCoverageBasisPoints, latestComparableBalanceChange, savingsRateBasisPoints } from "../../lib/finance/overview.ts";
import { activeOwnedAccountWhere, ownedAccountWhere, ownedSnapshotWhere } from "./financeOwnership.ts";
import { selectCurrentSnapshot } from "./financeSnapshots.ts";
import { balanceDateSchema, balanceSnapshotSchema, financeAccountSchema, localDateSchema, usdInputSchema } from "./financeValidation.ts";
import { planItemSchema, transactionSchema } from "./financeBudgetValidation.ts";
import { financeGoalSchema } from "./financeGoalValidation.ts";

test("USD input converts to exact integer cents", () => {
  assert.equal(parseUsdToCents("0"), BigInt(0));
  assert.equal(parseUsdToCents("12.3"), BigInt(1230));
  assert.equal(parseUsdToCents("0004.05"), BigInt(405));
  assert.equal(parseUsdToCents("-0.01"), BigInt(-1));
  assert.equal(centsToUsdInput(BigInt(-1)), "-0.01");
  assert.equal(formatUsdCents("123456789"), "$1,234,567.89");
  assert.equal(formatUsdCents("-50"), "-$0.50");
  assert.equal(sumCents(["10", BigInt(-3), "8"]), BigInt(15));
});

test("USD input rejects drift-prone or malformed values", () => {
  for (const value of ["", "1.001", "1e3", "1,000", "NaN", ".25", "10000000000000"]) {
    assert.equal(usdInputSchema.safeParse(value).success, false, value);
  }
});

test("local date validation handles leap years and invalid overflow", () => {
  assert.equal(localDateSchema.safeParse("2028-02-29").success, true);
  assert.equal(localDateSchema.safeParse("2027-02-29").success, false);
  assert.equal(localDateSchema.safeParse("2026-13-01").success, false);
  assert.equal(localDateSchema.safeParse("10/18/2026").success, false);
  assert.equal(balanceDateSchema.safeParse("2099-01-01").success, false);
});

test("account and snapshot validation is narrow", () => {
  assert.equal(financeAccountSchema.safeParse({ name: " Primary checking ", type: "CHECKING" }).success, true);
  assert.equal(financeAccountSchema.safeParse({ name: "", type: "INVESTMENT" }).success, false);
  assert.equal(balanceSnapshotSchema.safeParse({ accountId: "cm12345678901234567890123", balance: "100.25", asOfDate: "2026-10-18", note: "Manual check" }).success, true);
  assert.equal(balanceSnapshotSchema.safeParse({ accountId: "another-user", balance: "100", asOfDate: "2026-10-18", note: "" }).success, false);
});

test("ownership selectors always combine the record id and authenticated user", () => {
  assert.deepEqual(ownedAccountWhere("user-a", "account-a"), { id: "account-a", userId: "user-a" });
  assert.deepEqual(activeOwnedAccountWhere("user-a", "account-a"), { id: "account-a", userId: "user-a", archivedAt: null });
  assert.deepEqual(ownedSnapshotWhere("user-b", "snapshot-a"), { id: "snapshot-a", userId: "user-b" });
});

test("current balance ignores corrected history and uses date then recording time", () => {
  const snapshots = [
    { id: "old", asOfDate: "2026-10-17", recordedAt: "2026-10-17T12:00:00.000Z", correctedAt: null },
    { id: "corrected", asOfDate: "2026-10-20", recordedAt: "2026-10-20T12:00:00.000Z", correctedAt: "2026-10-20T13:00:00.000Z" },
    { id: "same-day-first", asOfDate: "2026-10-18", recordedAt: "2026-10-18T12:00:00.000Z", correctedAt: null },
    { id: "same-day-latest", asOfDate: "2026-10-18", recordedAt: "2026-10-18T13:00:00.000Z", correctedAt: null },
  ];
  assert.equal(selectCurrentSnapshot(snapshots)?.id, "same-day-latest");
  assert.equal(selectCurrentSnapshot(snapshots.map((snapshot) => ({ ...snapshot, correctedAt: "2026-10-21T00:00:00.000Z" }))), null);
});

const basePlan: RecurringPlan = { id: "plan", name: "Plan", accountId: "account", kind: "BILL", amountCents: "10000", recurrence: "MONTHLY", startDate: "2028-01-31", semimonthlyFirstDay: null, semimonthlySecondDay: null };

test("weekly and biweekly schedules use seven- and fourteen-day intervals", () => {
  const weekly = generateOccurrences([{ ...basePlan, recurrence: "WEEKLY", startDate: "2026-12-28" }], "2026-12-28", "2027-01-25").map((item) => item.date);
  const biweekly = generateOccurrences([{ ...basePlan, recurrence: "BIWEEKLY", startDate: "2026-12-28" }], "2026-12-28", "2027-01-25").map((item) => item.date);
  assert.deepEqual(weekly, ["2026-12-28", "2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25"]);
  assert.deepEqual(biweekly, ["2026-12-28", "2027-01-11", "2027-01-25"]);
});

test("twice-monthly is distinct from biweekly and clamps month overflow once", () => {
  const occurrences = generateOccurrences([{ ...basePlan, recurrence: "SEMIMONTHLY", startDate: "2028-01-01", semimonthlyFirstDay: 15, semimonthlySecondDay: 31 }], "2028-02-01", "2028-03-31").map((item) => item.date);
  assert.deepEqual(occurrences, ["2028-02-15", "2028-02-29", "2028-03-15", "2028-03-31"]);
  const clamped = generateOccurrences([{ ...basePlan, recurrence: "SEMIMONTHLY", startDate: "2027-01-01", semimonthlyFirstDay: 30, semimonthlySecondDay: 31 }], "2027-02-01", "2027-02-28");
  assert.equal(clamped.length, 1);
});

test("monthly, quarterly, and yearly schedules preserve anchors across irregular dates", () => {
  assert.deepEqual(generateOccurrences([basePlan], "2028-01-01", "2028-03-31").map((item) => item.date), ["2028-01-31", "2028-02-29", "2028-03-31"]);
  assert.deepEqual(generateOccurrences([{ ...basePlan, recurrence: "QUARTERLY" }], "2028-01-01", "2028-08-01").map((item) => item.date), ["2028-01-31", "2028-04-30", "2028-07-31"]);
  assert.deepEqual(generateOccurrences([{ ...basePlan, recurrence: "YEARLY", startDate: "2028-02-29" }], "2028-01-01", "2029-03-01").map((item) => item.date), ["2028-02-29", "2029-02-28"]);
});

test("planned surplus subtracts bills and allowance from income", () => {
  const summary = summarizePlanned([
    { planId: "income", name: "Income", accountId: "a", kind: "INCOME", amountCents: "300000", date: "2026-10-20" },
    { planId: "bill", name: "Bill", accountId: "a", kind: "BILL", amountCents: "100000", date: "2026-10-21" },
    { planId: "allowance", name: "Allowance", accountId: "a", kind: "ALLOWANCE", amountCents: "25000", date: "2026-10-22" },
  ]);
  assert.equal(summary.surplusCents, BigInt(175000));
});

test("recorded transfers are excluded from earnings, expenses, and net cash flow", () => {
  const summary = summarizeRecorded([{ type: "INCOME", amountCents: "20000" }, { type: "EXPENSE", amountCents: "5000" }, { type: "TRANSFER", amountCents: "9000" }, { type: "EXPENSE", amountCents: "4000", voidedAt: "2026-10-18T12:00:00Z" }]);
  assert.deepEqual(summary, { incomeCents: BigInt(20000), expenseCents: BigInt(5000), transferCents: BigInt(9000), netCashFlowCents: BigInt(15000) });
});

test("budget validation requires positive amounts and valid transfer ownership shape", () => {
  const plan = { accountId: "cm12345678901234567890123", name: "Rent", kind: "BILL", amount: "1200.00", category: "Housing", recurrence: "SEMIMONTHLY", startDate: "2026-10-01", semimonthlyFirstDay: 1, semimonthlySecondDay: 15 };
  assert.equal(planItemSchema.safeParse(plan).success, true);
  assert.equal(planItemSchema.safeParse({ ...plan, amount: "0" }).success, false);
  assert.equal(planItemSchema.safeParse({ ...plan, semimonthlySecondDay: 1 }).success, false);
  const transaction = { accountId: "cm12345678901234567890123", transferAccountId: "cm22345678901234567890123", name: "Move cash", type: "TRANSFER", amount: "25.00", occurredOn: "2026-10-18", category: "", note: "" };
  assert.equal(transactionSchema.safeParse(transaction).success, true);
  assert.equal(transactionSchema.safeParse({ ...transaction, transferAccountId: transaction.accountId }).success, false);
  assert.equal(transactionSchema.safeParse({ ...transaction, type: "EXPENSE" }).success, false);
});

test("advisor transfer preserves the buffer at every known point", () => {
  const result = calculateCheckingBuffer({
    startingBalanceCents: "1000000",
    safetyBufferCents: "200000",
    manualIncomeCents: "0",
    manualBillsCents: "0",
    manualAllowanceCents: "0",
    scheduleConfirmed: true,
    occurrences: [
      { planId: "bill", name: "Bill", accountId: "a", kind: "BILL", amountCents: "300000", date: "2026-10-20" },
      { planId: "income", name: "Income", accountId: "a", kind: "INCOME", amountCents: "200000", date: "2026-10-21" },
    ],
  });
  assert.equal(result.safeTransferCents, BigInt(500000));
  assert.equal(result.projectedLowAfterTransferCents, BigInt(200000));
  assert.equal(result.confidence, "READY");
});

test("advisor defaults to zero and reports shortfalls conservatively", () => {
  const base = { startingBalanceCents: "100000", safetyBufferCents: "50000", manualIncomeCents: "90000", manualBillsCents: "80000", manualAllowanceCents: "30000", occurrences: [] };
  const incomplete = calculateCheckingBuffer({ ...base, scheduleConfirmed: false });
  assert.equal(incomplete.safeTransferCents, BigInt(0));
  assert.equal(incomplete.confidence, "INCOMPLETE");
  const confirmed = calculateCheckingBuffer({ ...base, scheduleConfirmed: true });
  assert.equal(confirmed.lowestProjectedCents, BigInt(-10000));
  assert.equal(confirmed.projectedEndCents, BigInt(80000));
  assert.equal(confirmed.shortfallCents, BigInt(60000));
  assert.equal(confirmed.safeTransferCents, BigInt(0));
});

test("APY parsing and illustration use effective annual yield with final-cent rounding", () => {
  assert.equal(parseApyPercentToPpm("4.25"), 42500);
  assert.equal(parseApyPercentToPpm("0.0001"), 1);
  assert.throws(() => parseApyPercentToPpm("4.12345"));
  assert.throws(() => parseApyPercentToPpm("100.0001"));
  const result = illustrateApy("100000", parseApyPercentToPpm("4"), 12);
  assert.deepEqual(result, { principalCents: BigInt(100000), interestCents: BigInt(4000), endingBalanceCents: BigInt(104000), days: 365 });
});

test("goal progress estimates completion without counting allocation as spending", () => {
  const progress = calculateGoalProgress({ targetCents: "100000", allocatedCents: "25000", monthlyContributionCents: "20000" }, "2026-10-31");
  assert.deepEqual(progress, { remainingCents: BigInt(75000), progressBasisPoints: 2500, monthsToGoal: 4, estimatedCompletionDate: "2027-02-28" });
  const paused = calculateGoalProgress({ targetCents: "100000", allocatedCents: "25000", monthlyContributionCents: "0" }, "2026-10-31");
  assert.equal(paused.estimatedCompletionDate, null);
});

test("goal validation requires a positive target and allocation within target", () => {
  const goal = { accountId: "cm12345678901234567890123", name: "Emergency", kind: "EMERGENCY", target: "5000.00", allocation: "1200.00", monthlyContribution: "250.00" };
  assert.equal(financeGoalSchema.safeParse(goal).success, true);
  assert.equal(financeGoalSchema.safeParse({ ...goal, target: "0" }).success, false);
  assert.equal(financeGoalSchema.safeParse({ ...goal, allocation: "5000.01" }).success, false);
  assert.equal(financeGoalSchema.safeParse({ ...goal, monthlyContribution: "-1" }).success, false);
  assert.equal(financeGoalSchema.safeParse({ ...goal, target: "not-money" }).success, false);
});

test("growth simulation separates principal, contributions, and estimated interest", () => {
  const noRate = simulateSavingsGrowth("100000", "10000", 0, 12);
  assert.deepEqual(noRate, { startingPrincipalCents: BigInt(100000), contributionPrincipalCents: BigInt(120000), totalPrincipalCents: BigInt(220000), estimatedInterestCents: BigInt(0), endingBalanceCents: BigInt(220000) });
  const annual = simulateSavingsGrowth("100000", "0", parseApyPercentToPpm("4"), 12);
  assert.equal(annual.endingBalanceCents, BigInt(104000));
  assert.equal(annual.estimatedInterestCents, BigInt(4000));
});

test("cash history aggregates the latest actual snapshot per account and ignores corrections", () => {
  const history = buildCashHistory([
    { id: "a", snapshots: [
      { balanceCents: "10000", asOfDate: "2026-01-01", recordedAt: "2026-01-01T12:00:00Z", correctedAt: null },
      { balanceCents: "15000", asOfDate: "2026-01-03", recordedAt: "2026-01-03T12:00:00Z", correctedAt: null },
      { balanceCents: "999999", asOfDate: "2026-01-04", recordedAt: "2026-01-04T12:00:00Z", correctedAt: "2026-01-04T13:00:00Z" },
    ] },
    { id: "b", snapshots: [{ balanceCents: "20000", asOfDate: "2026-01-02", recordedAt: "2026-01-02T12:00:00Z", correctedAt: null }] },
  ]);
  assert.deepEqual(history.map((point) => ({ date: point.date, total: point.totalCents, ids: point.accountIds })), [
    { date: "2026-01-01", total: BigInt(10000), ids: ["a"] },
    { date: "2026-01-02", total: BigInt(30000), ids: ["a", "b"] },
    { date: "2026-01-03", total: BigInt(35000), ids: ["a", "b"] },
  ]);
  assert.deepEqual(latestComparableBalanceChange(history), { fromDate: "2026-01-02", toDate: "2026-01-03", changeCents: BigInt(5000) });
});

test("overview withholds incomparable changes and labels calculable coverage rates", () => {
  assert.equal(latestComparableBalanceChange([
    { date: "2026-01-01", totalCents: BigInt(10000), accountIds: ["a"] },
    { date: "2026-01-02", totalCents: BigInt(30000), accountIds: ["a", "b"] },
  ]), null);
  assert.equal(savingsRateBasisPoints("400000", "100000"), 2500);
  assert.equal(savingsRateBasisPoints("0", "100000"), null);
  assert.equal(fundingCoverageBasisPoints([{ targetCents: "100000", allocatedCents: "25000" }, { targetCents: "50000", allocatedCents: "25000" }]), 3333);
  assert.equal(fundingCoverageBasisPoints([]), null);
});
