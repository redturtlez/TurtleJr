import Link from "next/link";
import { generateMetadata } from "../../../lib/server";
import styles from "./fruit-fly-yugioh.module.css";

export const metadata = generateMetadata({
  title: "Fruit Fly Plays Yu-Gi-Oh!",
  description: "An experimental fruit fly brain-inspired AI trained through simulated Yu-Gi-Oh games.",
});

const tags = ["Artificial Intelligence", "Neural Networks", "Game Simulation"];
const highlights = [
  { value: "40,000", label: "simulated training games" },
  { value: "First-turn win", label: "training objective" },
  { value: "Fruit fly", label: "connectome inspiration" },
  { value: "Yu-Gi-Oh", label: "game environment" },
];
const flow = ["Fruit fly brain", "Neural model", "Game state", "Action selection", "Yu-Gi-Oh engine", "Training feedback"];

export default function FruitFlyYugiohPage() {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <Link href="/projects" className={styles.backLink}>← Back to projects</Link>
        <p className={styles.eyebrow}>Personal experiment · artificial intelligence</p>
        <h1>Teaching a Fruit Fly<br /><span>to Play Yu-Gi-Oh!</span></h1>
        <p className={styles.intro}>What happens when you take a neural architecture derived from a fruit fly&apos;s brain and teach it to play Yu-Gi-Oh? This experiment connects a brain-inspired AI model to an open-source game engine and trains it across 40,000 simulated games toward achieving a first-turn win.</p>
        <div className={styles.tags}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </header>

      <section className={styles.replaySection} aria-labelledby="replay-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>01 / Replay</p><h2 id="replay-heading">An AI learning by playing.</h2></div>
        <div className={styles.videoFrame}><video controls playsInline preload="metadata" src="/replay.mp4" aria-label="Fruit Fly Yu-Gi-Oh AI replay" /></div>
        <p className={styles.caption}>It wasn&apos;t the best, but it tried it&apos;s best.</p>
      </section>

      <section className={styles.section} aria-labelledby="how-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>02 / How it works</p><h2 id="how-heading">A small brain, a very large rule set.</h2></div>
        <p className={styles.bodyCopy}>The model takes inspiration from publicly available fruit fly connectome research, then uses that biological idea as a starting point for an AI that can process a game state and choose what to do next. Simulated matches provide the repeated practice loop.</p>
        <ol className={styles.flow}>{flow.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong>{index < flow.length - 1 && <i aria-hidden="true">→</i>}</li>)}</ol>
      </section>

      <section className={styles.section} aria-labelledby="highlights-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>03 / Project highlights</p><h2 id="highlights-heading">The experiment in four signals.</h2></div>
        <div className={styles.highlights}>{highlights.map((highlight) => <div className={styles.highlight} key={highlight.label}><strong>{highlight.value}</strong><span>{highlight.label}</span></div>)}</div>
      </section>

      <section className={styles.section} aria-labelledby="lessons-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>04 / Lessons</p><h2 id="lessons-heading">Curiosity was part of the objective.</h2></div>
        <div className={styles.lessonGrid}><p>Connecting biological research with software creates useful questions about what an abstract neural system should see, remember, and do.</p><p>Yu-Gi-Oh adds a dense ruleset and a broad action space, making every simulated game a practical test of how the model turns a changing state into a decision.</p><p>The first-turn win was the goal of training, not a claim of consistent success. The replay captures the more interesting result: an AI trying to make sense of the game.</p></div>
      </section>

      <footer className={styles.footer}><Link href="/projects">← Explore more projects</Link><span>Built as a personal experiment.</span></footer>
    </article>
  );
}
