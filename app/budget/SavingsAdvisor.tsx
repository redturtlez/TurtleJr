"use client";

import { useState } from "react";
import { CircleAlert, PiggyBank, ShieldCheck } from "lucide-react";
import { formatUsdCents, parseUsdToCents } from "@/lib/finance/money";
import { calculateCheckingBuffer, illustrateApy, parseApyPercentToPpm } from "@/lib/finance/advisor";
import { addDaysToKey, generateOccurrences } from "@/lib/finance/recurrence";
import type { FinanceAccountData } from "./financeData";
import type { FinanceBudgetData } from "./financeBudgetData";
import styles from "./budget.module.css";

interface ApyScenario { name: string; apy: string; liquidity: "IMMEDIATE" | "LIMITED" | "TERM" }

const INITIAL_SCENARIOS: ApyScenario[] = [
  { name: "Scenario A", apy: "", liquidity: "IMMEDIATE" },
  { name: "Scenario B", apy: "", liquidity: "LIMITED" },
  { name: "Scenario C", apy: "", liquidity: "TERM" },
];

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function optionalNonnegativeCents(value: string): bigint {
  if (!value.trim()) return BigInt(0);
  const cents = parseUsdToCents(value);
  if (cents < BigInt(0)) throw new Error("Advisor amounts cannot be negative");
  return cents;
}

function liquidityLabel(value: ApyScenario["liquidity"]): string {
  if (value === "IMMEDIATE") return "Immediate access";
  if (value === "LIMITED") return "Limited withdrawals";
  return "Term / possible early-withdrawal limits";
}

export default function SavingsAdvisor({ accounts, data }: { accounts: FinanceAccountData[]; data: FinanceBudgetData }) {
  const checkingAccounts = accounts.filter((account) => account.type === "CHECKING");
  const [accountId, setAccountId] = useState(checkingAccounts[0]?.id ?? "");
  const [horizonDays, setHorizonDays] = useState(30);
  const [safetyBuffer, setSafetyBuffer] = useState("0.00");
  const [manualIncome, setManualIncome] = useState("");
  const [manualBills, setManualBills] = useState("");
  const [manualAllowance, setManualAllowance] = useState("");
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);
  const [comparisonMonths, setComparisonMonths] = useState(12);
  const [scenarios, setScenarios] = useState(INITIAL_SCENARIOS);
  const account = checkingAccounts.find((item) => item.id === accountId) ?? checkingAccounts[0];
  const today = todayKey();

  let inputError: string | null = null;
  let result: ReturnType<typeof calculateCheckingBuffer> | null = null;
  if (account?.currentBalanceCents !== null && account?.currentBalanceCents !== undefined) {
    try {
      const occurrences = generateOccurrences(
        data.planItems.filter((item) => item.accountId === account.id),
        today,
        addDaysToKey(today, horizonDays - 1),
      );
      result = calculateCheckingBuffer({
        startingBalanceCents: account.currentBalanceCents,
        occurrences,
        safetyBufferCents: optionalNonnegativeCents(safetyBuffer),
        manualIncomeCents: optionalNonnegativeCents(manualIncome),
        manualBillsCents: optionalNonnegativeCents(manualBills),
        manualAllowanceCents: optionalNonnegativeCents(manualAllowance),
        scheduleConfirmed,
      });
    } catch (error) {
      inputError = error instanceof Error ? error.message : "Check the advisor inputs";
    }
  }

  const updateScenario = (index: number, change: Partial<ApyScenario>): void => {
    setScenarios((current) => current.map((scenario, scenarioIndex) => scenarioIndex === index ? { ...scenario, ...change } : scenario));
  };

  return (
    <section className={styles.advisor} aria-labelledby="advisor-title">
      <div className={styles.advisorHeading}>
        <div><small>Manual scenario tool</small><h2 id="advisor-title">Savings advisor</h2></div>
        <span>No money moves and no rates are fetched or saved.</span>
      </div>

      <div className={styles.advisorGrid}>
        <section className={styles.advisorPanel}>
          <div className={styles.advisorPanelHead}><ShieldCheck /><div><small>Checking protection</small><h3>Reserve known cash needs</h3></div></div>
          {!checkingAccounts.length ? <p className={styles.advisorNotice}><CircleAlert />Add a checking account and a current balance before running a scenario.</p> : (
            <>
              <div className={styles.advisorFields}>
                <label>Checking account<select value={account?.id ?? ""} onChange={(event) => { setAccountId(event.target.value); setScheduleConfirmed(false); }}>{checkingAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Reserve horizon<select value={horizonDays} onChange={(event) => { setHorizonDays(Number(event.target.value)); setScheduleConfirmed(false); }}><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label>
                <label>Safety buffer<input value={safetyBuffer} inputMode="decimal" onChange={(event) => { setSafetyBuffer(event.target.value); setScheduleConfirmed(false); }} aria-describedby="advisor-input-note" /></label>
                <label>Additional expected receipts<input value={manualIncome} inputMode="decimal" placeholder="0.00" onChange={(event) => { setManualIncome(event.target.value); setScheduleConfirmed(false); }} /></label>
                <label>Additional bills<input value={manualBills} inputMode="decimal" placeholder="0.00" onChange={(event) => { setManualBills(event.target.value); setScheduleConfirmed(false); }} /></label>
                <label>Additional allowance<input value={manualAllowance} inputMode="decimal" placeholder="0.00" onChange={(event) => { setManualAllowance(event.target.value); setScheduleConfirmed(false); }} /></label>
              </div>
              <p id="advisor-input-note" className={styles.advisorHelp}>Undated bills and allowance are reserved immediately. Undated receipts are included only at the horizon end and never increase the safe-transfer amount.</p>
              <label className={styles.advisorConfirm}><input type="checkbox" checked={scheduleConfirmed} onChange={(event) => setScheduleConfirmed(event.target.checked)} />I reviewed this account&apos;s scheduled cash flow and added known items for this horizon.</label>
              {inputError ? <p className={styles.advisorNotice}><CircleAlert />{inputError}</p> : account?.currentBalanceCents === null ? <p className={styles.advisorNotice}><CircleAlert />Record a current balance for this checking account first.</p> : null}
              {result ? <div className={styles.advisorResults}>
                <article><span>Current checking</span><strong>{formatUsdCents(account?.currentBalanceCents ?? "0")}</strong></article>
                <article><span>Known planned inflow</span><strong>{formatUsdCents(result.plannedIncomeCents)}</strong></article>
                <article><span>Known planned outflow</span><strong>{formatUsdCents(result.plannedOutflowCents)}</strong></article>
                <article><span>Projected low before transfer</span><strong>{formatUsdCents(result.lowestProjectedCents)}</strong></article>
                <article className={styles.advisorPrimary}><span>Maximum scenario transfer</span><strong>{formatUsdCents(result.safeTransferCents)}</strong><small>{result.confidence === "INCOMPLETE" ? "Locked until schedule review is confirmed" : result.confidence === "SHORTFALL" ? `Projected buffer shortfall: ${formatUsdCents(result.shortfallCents)}` : `Projected low after scenario: ${formatUsdCents(result.projectedLowAfterTransferCents)}`}</small></article>
                <article><span>Projected horizon end</span><strong>{formatUsdCents(result.projectedEndCents)}</strong></article>
              </div> : null}
            </>
          )}
        </section>

        <section className={styles.advisorPanel}>
          <div className={styles.advisorPanelHead}><PiggyBank /><div><small>Hypothetical comparison</small><h3>Manual APY scenarios</h3></div></div>
          <label className={styles.advisorHorizon}>Illustration horizon<select value={comparisonMonths} onChange={(event) => setComparisonMonths(Number(event.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>1 year</option><option value={24}>2 years</option><option value={60}>5 years</option></select></label>
          <div className={styles.apyScenarios}>{scenarios.map((scenario, index) => {
            let illustration: ReturnType<typeof illustrateApy> | null = null;
            let error: string | null = null;
            if (scenario.apy.trim()) {
              try { illustration = illustrateApy(result?.safeTransferCents ?? BigInt(0), parseApyPercentToPpm(scenario.apy), comparisonMonths); }
              catch (caught) { error = caught instanceof Error ? caught.message : "Invalid APY"; }
            }
            return <article key={index}>
              <input aria-label={`Scenario ${index + 1} name`} value={scenario.name} maxLength={40} onChange={(event) => updateScenario(index, { name: event.target.value })} />
              <label>APY %<input aria-label={`${scenario.name} APY percent`} value={scenario.apy} inputMode="decimal" placeholder="Enter APY" onChange={(event) => updateScenario(index, { apy: event.target.value })} /></label>
              <label>Liquidity<select value={scenario.liquidity} onChange={(event) => updateScenario(index, { liquidity: event.target.value as ApyScenario["liquidity"] })}><option value="IMMEDIATE">Immediate</option><option value="LIMITED">Limited</option><option value="TERM">Term</option></select></label>
              <div><span>Illustrative interest</span><strong>{illustration ? formatUsdCents(illustration.interestCents) : "—"}</strong><small>{error ?? `${liquidityLabel(scenario.liquidity)} · ending ${illustration ? formatUsdCents(illustration.endingBalanceCents) : "—"}`}</small></div>
            </article>;
          })}</div>
          <p className={styles.advisorDisclosure}>APY is treated as effective annual yield with no added deposits; the final balance is rounded once to the nearest cent. Results are hypothetical—not a recommendation or guarantee. Rates may change, and taxes, fees, withdrawal terms, and liquidity can reduce results. Deposit protection depends on the institution, account ownership, and applicable limits.</p>
        </section>
      </div>
    </section>
  );
}
