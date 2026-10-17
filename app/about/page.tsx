import Link from "next/link";
import { generateMetadata } from "../../lib/server";
import Resume from "./resume";
import styles from "./about.module.css";

export const metadata = generateMetadata({ title: "About" });

export default function AboutPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}><p>About Turtle Jr</p><h1>One site.<br /><span>Useful ideas, shipped.</span></h1></header>
      <div className={styles.layout}>
        <article className={styles.story}>
          <span className={styles.number}>01 / The platform</span>
          <h2>A portfolio that works like a product.</h2>
          <p>TurtleJr.dev is a mobile-first progressive web app built with Next.js. It combines a professional portfolio with practical tools, experiments, and creative projects in one evolving platform.</p>
          <p>The signed-in workspace includes productivity tools for tasks, health, and budgeting. Public experiences such as the card creators show the same focus on useful software, careful details, and hands-on problem solving.</p>
        </article>
        <aside className={styles.details} id="resume">
          <div><small>Focus</small><strong>Full-stack engineering</strong></div>
          <div><small>Approach</small><strong>Mobile-first & practical</strong></div>
          <div><small>Stack</small><strong>Next.js · TypeScript · Java</strong></div>
          <div className={styles.resume}><small>Experience</small><Resume /></div>
        </aside>
      </div>
      <section className={styles.artFeature} aria-labelledby="art-feature-heading">
        <div><span className={styles.number}>02 / The studio</span><h2 id="art-feature-heading">The work does not stop at the screen.</h2></div>
        <div className={styles.artCopy}><p>Alongside software, I make physical art: custom trading cards, painted Pokémon full arts, card mosaics, 3D-printed paintings, and large-format canvas work. The Art gallery is a growing record of those finished pieces and the ideas behind them.</p><Link href="/art">Explore the art <span aria-hidden="true">↗</span></Link></div>
      </section>
      <footer className={styles.contact}><span>Have a project or opportunity in mind?</span><a href="mailto:simone.mineo424@gmail.com">simone.mineo424@gmail.com <b aria-hidden="true">↗</b></a></footer>
    </section>
  );
}
