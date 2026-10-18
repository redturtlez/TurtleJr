"use client";

import { Check, Clock3, Lightbulb, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "react-toastify";
import { respondToRecommendation } from "./actions";
import type { LifeDashboardData } from "./data";
import styles from "./health.module.css";

export default function InsightsPanel({ data }: { data: LifeDashboardData }) {
  const [pending, startTransition] = useTransition();
  const latest = data.trends.at(-1);
  const respond = (fingerprint: string, status: "ACCEPTED" | "DISMISSED" | "SNOOZED"): void => startTransition(async () => {
    try { await respondToRecommendation({ fingerprint, status }); toast.success(status === "SNOOZED" ? "Suggestion postponed for one week" : "Response saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your response"); }
  });
  return <section className={styles.insightsGrid}>
    <div className={styles.insightPanel}><div className={styles.sectionLead}><small>Weekly review</small><h2>{latest?.rate ?? 0}% completion this week</h2><p>{latest ? `${latest.completed} of ${latest.scheduled} scheduled activities completed, with ${latest.skipped} explicitly skipped.` : "Your review will appear as history builds."}</p></div>
      <div className={styles.trendChart} aria-label="Four-week completion trend">{data.trends.map((week) => <div key={week.startDate}><span>{week.rate === null ? "—" : `${week.rate}%`}</span><i><b style={{ height: `${Math.max(4, week.rate ?? 0)}%` }} /></i><small>{week.endDate.slice(5)}</small></div>)}</div>
      <p className={styles.methodNote}>Rates compare completed check-ins with scheduled occurrences. Snoozed or unmarked activities remain incomplete; skipped activities are shown separately.</p>
    </div>
    <div className={styles.recommendationPanel}><div className={styles.panelHeading}><div><small>Deterministic suggestions</small><h2>Worth a look</h2></div><Lightbulb /></div>
      {data.recommendations.length ? data.recommendations.map((item) => <article className={styles.recommendation} key={item.fingerprint}><b>{item.tone === "REVIEW" ? "Review" : "Momentum"}</b><h3>{item.title}</h3><p>{item.evidence}</p><small>No routine or target will change automatically.</small><div><button disabled={pending} onClick={() => respond(item.fingerprint, "ACCEPTED")}><Check />Accept</button><button disabled={pending} onClick={() => respond(item.fingerprint, "SNOOZED")}><Clock3 />Later</button><button disabled={pending} onClick={() => respond(item.fingerprint, "DISMISSED")}><X />Dismiss</button></div></article>) : <p className={styles.emptyCopy}>No suggestion has enough recent evidence yet. At least six scheduled occurrences are required.</p>}
    </div>
  </section>;
}
