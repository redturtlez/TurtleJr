"use client";

import { Apple, Check, Clock3, Lightbulb, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "react-toastify";
import { respondToRecommendation } from "./actions";
import type { InsightsDashboardData } from "./data";
import type { NutritionInsightReview } from "./nutrition";
import styles from "./health.module.css";

function nutritionEmptyCopy(review: NutritionInsightReview): string {
  if (review.status === "INSUFFICIENT_LOGS") return `Log food on ${Math.max(0, 4 - review.daysLogged)} more day${4 - review.daysLogged === 1 ? "" : "s"} this week before drawing a pattern.`;
  if (review.status === "NO_TARGETS") return "Set nutrition targets before comparing recent intake.";
  if (review.status === "LIMITED_DATA") return "Recent logs do not contain enough confirmed nutrient values for a reliable suggestion.";
  return "No supported nutrient was meaningfully below its configured target across recent logged days.";
}

export default function InsightsPanel({ data, nutrition }: { data: InsightsDashboardData; nutrition: { insightReview: NutritionInsightReview } }) {
  const [pending, startTransition] = useTransition();
  const latest = data.trends.at(-1);
  const previous = data.trends.at(-2);
  const comparison = latest?.rate !== null && latest?.rate !== undefined && previous?.rate !== null && previous?.rate !== undefined ? latest.rate - previous.rate : null;
  const respond = (fingerprint: string, status: "ACCEPTED" | "DISMISSED" | "SNOOZED"): void => startTransition(async () => {
    try { await respondToRecommendation({ fingerprint, status }); toast.success(status === "SNOOZED" ? "Suggestion postponed for one week" : "Response saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your response"); }
  });

  return <section className={styles.insightsGrid}>
    <article className={styles.insightPanel}>
      <div className={styles.sectionLead}>
        <small>Weekly review</small>
        <h2>{latest?.scheduled ? `${latest.rate}% completion this week` : "No scheduled activity this week"}</h2>
        <p>{latest?.scheduled ? `${latest.completed} of ${latest.scheduled} scheduled activities completed, with ${latest.skipped} explicitly skipped.` : "Completion rates will appear after activities have been scheduled."}</p>
        {comparison !== null ? <span className={styles.trendDelta} data-direction={comparison > 0 ? "up" : comparison < 0 ? "down" : "steady"}>{comparison > 0 ? <TrendingUp /> : comparison < 0 ? <TrendingDown /> : null}{comparison === 0 ? "Unchanged" : `${Math.abs(comparison)} points ${comparison > 0 ? "higher" : "lower"}`} than the previous week</span> : null}
      </div>
      <div className={styles.trendChart} aria-label="Four-week completion trend">{data.trends.map((week) => <div key={week.startDate}><span>{week.rate === null ? "—" : `${week.rate}%`}</span><i data-empty={week.rate === null}><b style={{ height: week.rate === null ? 0 : `${Math.max(4, week.rate)}%` }} /></i><small>{week.endDate.slice(5)}</small></div>)}</div>
      <p className={styles.methodNote}>Rates compare completed check-ins with scheduled occurrences. Snoozed or unmarked activities remain incomplete; skipped activities are shown separately.</p>
    </article>

    <article className={styles.recommendationPanel}>
      <div className={styles.panelHeading}><div><small>Prioritized suggestions</small><h2>Worth a look</h2></div><Lightbulb /></div>
      {data.recommendations.length ? data.recommendations.map((item) => <div className={styles.recommendation} key={item.fingerprint}><b>{item.tone === "REVIEW" ? "Review" : "Momentum"}</b><h3>{item.title}</h3><p>{item.evidence}</p><small>No routine or target will change automatically.</small><div><button disabled={pending} onClick={() => respond(item.fingerprint, "ACCEPTED")}><Check />Got it</button><button disabled={pending} onClick={() => respond(item.fingerprint, "SNOOZED")}><Clock3 />Later</button><button disabled={pending} onClick={() => respond(item.fingerprint, "DISMISSED")}><X />Dismiss</button></div></div>) : <p className={styles.emptyCopy}>No suggestion has enough recent evidence yet. Routine recommendations require at least six scheduled occurrences.</p>}
    </article>

    <article className={styles.insightPanel}>
      <div className={styles.panelHeading}><div><small>Habit patterns</small><h2>What repeats</h2></div><TrendingUp /></div>
      <div className={styles.patternList}>{data.patterns.length ? data.patterns.map((pattern) => <div key={pattern.key}><b data-kind={pattern.kind}>{pattern.kind === "WEEKDAY_FRICTION" ? "Day pattern" : pattern.kind === "DECLINING" ? "Recent decline" : "Improving"}</b><h3>{pattern.title}</h3><p>{pattern.evidence}</p></div>) : <p className={styles.emptyCopy}>Patterns appear after consecutive periods or repeated weekdays have enough scheduled history.</p>}</div>
    </article>

    <article className={styles.insightPanel}>
      <div className={styles.panelHeading}><div><small>Nutrition review</small><h2>Supported opportunities</h2></div><Apple /></div>
      <div className={styles.nutritionInsightList}>{nutrition.insightReview.insights.length ? nutrition.insightReview.insights.map((item) => <div key={item.key}><span><strong>{item.label}</strong><b>{item.percent}%</b></span><p>{item.evidence} Review saved foods and meal suggestions that contribute more {item.label.toLocaleLowerCase()}.</p></div>) : <p className={styles.emptyCopy}>{nutritionEmptyCopy(nutrition.insightReview)}</p>}</div>
      <p className={styles.methodNote}>Suggestions use configured targets and confirmed recent logs. They are informational, not medical guidance.</p>
    </article>
  </section>;
}
