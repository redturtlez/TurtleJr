import styles from "./health.module.css";

export default function HealthLoading() {
  return (
    <section className={styles.routeSkeleton} aria-label="Loading Life Dashboard section" aria-busy="true">
      <div className={styles.skeletonLead}><span /><span /><span /></div>
      <div className={styles.skeletonGrid}>
        <article><span /><span /><span /></article>
        <article><span /><span /><span /></article>
        <article><span /><span /><span /></article>
        <article><span /><span /><span /></article>
      </div>
    </section>
  );
}
