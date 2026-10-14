"use client";

import Image from "next/image";
import Link from "next/link";
import { Github, Linkedin } from "public/svg";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}><span /> Full-stack engineer · Product builder</div>
          <h1>Building useful software with a <em>practical edge.</em></h1>
          <p className={styles.intro}>I&apos;m Simonè, a software engineer creating reliable systems, thoughtful interfaces, and personal tools that solve real problems.</p>
          <div className={styles.actions}>
            <Link href="/projects" className={styles.primaryAction}>Explore my work <span aria-hidden="true">↗</span></Link>
            <Link href="/card-creator" className={styles.secondaryAction}>Open Card Studio</Link>
          </div>
          <div className={styles.capabilities} aria-label="Areas of focus"><span>Next.js & TypeScript</span><span>Java & Spring</span><span>Product-minded</span></div>
        </div>
        <div className={styles.visual}>
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.portraitCard}>
            <div className={styles.portraitGlow} aria-hidden="true" />
            <Image src="/me.png" className={styles.portrait} fill sizes="(max-width: 760px) 78vw, 430px" alt="Portrait of Simonè Mineo" priority />
            <div className={styles.profileLabel}><span>SM</span><div><strong>Simonè Mineo</strong><small>Software Engineer</small></div></div>
          </div>
          <div className={styles.socials}>
            <Link href="https://github.com/redturtlez" target="_blank" rel="noreferrer" aria-label="GitHub profile"><Github /></Link>
            <Link href="https://www.linkedin.com/in/simone-mineo-abc123/" target="_blank" rel="noreferrer" aria-label="LinkedIn profile"><Linkedin /></Link>
          </div>
        </div>
      </div>
      <div className={styles.focusGrid}>
        <article><span>01</span><div><h2>Systems</h2><p>Reliable services built for scale and maintainability.</p></div></article>
        <article><span>02</span><div><h2>Interfaces</h2><p>Responsive tools that feel clear and intentional.</p></div></article>
        <article><span>03</span><div><h2>Experiments</h2><p>Card creators, utilities, and ideas shipped to the web.</p></div></article>
      </div>
    </section>
  );
}
