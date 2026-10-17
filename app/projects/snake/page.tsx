import Link from "next/link";
import { generateMetadata } from "../../../lib/server";
import SnakeGame from "../../snake/SnakeGame";
import styles from "./snake-project.module.css";

export const metadata = generateMetadata({
  title: "Snake — AI Coding Proof of Concept",
  description: "A small browser-game prototype built to learn AI-assisted coding through a playable Snake implementation.",
});

export default function SnakeProjectPage() {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <Link href="/projects" className={styles.backLink}>← Back to projects</Link>
        <p className={styles.eyebrow}>Early proof of concept · browser game</p>
        <h1>Snake, built<br /><span>to learn by making.</span></h1>
        <p className={styles.intro}>This small browser game was an early experiment in learning how to use AI-assisted coding. The goal was simple: take a familiar idea, guide it into working software, and learn through each round of iteration.</p>
      </header>

      <section className={styles.project} aria-labelledby="play-heading">
        <div className={styles.gamePanel}>
          <div className={styles.panelHeading}><p className={styles.eyebrow}>Playable prototype</p><h2 id="play-heading">Classic Snake</h2></div>
          <SnakeGame />
        </div>
        <aside className={styles.context} aria-labelledby="context-heading">
          <p className={styles.eyebrow}>Project note</p>
          <h2 id="context-heading">A starting point, not a centerpiece.</h2>
          <p>The interesting part was not reinventing Snake. It was learning how to describe behavior, review generated code, spot rough edges, and keep refining until the result worked across keyboard and touch controls.</p>
          <p>It remains here as an honest snapshot of an early learning experiment.</p>
          <div className={styles.tags} aria-label="Technologies"><span>React</span><span>TypeScript</span><span>Browser Game</span></div>
        </aside>
      </section>

      <footer className={styles.footer}><Link href="/projects">← Explore more projects</Link><span>Early AI-assisted coding experiment.</span></footer>
    </article>
  );
}
