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
          <p className={styles.eyebrow}><span>Hello, I&apos;m</span><strong>Simonè Mineo.</strong></p>
          <h1>I build software for <em>busy systems</em> and curious people.</h1>
          <p className={styles.intro}>By day, I engineer logistics software that has to keep moving. After hours, I turn useful ideas, including a few wonderfully niche ones, into things you can actually use.</p>
          <div className={styles.actions}>
            <Link href="/projects" className={styles.primaryAction}>See what I&apos;ve built <span aria-hidden="true">↗</span></Link>
            <Link href="/about#resume" className={styles.secondaryAction}>Open my résumé</Link>
          </div>
          <dl className={styles.snapshot} aria-label="Areas of experience">
            <div><dt>Professional</dt><dd>Java, Spring, APIs and distributed systems</dd></div>
            <div><dt>Personal</dt><dd>Next.js, creative tools and small experiments</dd></div>
          </dl>
        </div>
        <div className={styles.visual}>
          <div className={styles.monogram} aria-hidden="true">SIMONÈ</div>
          <div className={styles.portraitCard}>
            <div className={styles.portraitGlow} aria-hidden="true" />
            <Image src="/me.png" className={styles.portrait} fill sizes="(max-width: 760px) 78vw, 430px" alt="Portrait of Simonè Mineo" priority />
            <div className={styles.profileLabel}><span aria-hidden="true">01</span><div><strong>Software engineer</strong><small>Building from wherever the problem is</small></div></div>
          </div>
          <div className={styles.socials}>
            <Link href="https://github.com/redturtlez" target="_blank" rel="noreferrer" aria-label="GitHub profile"><Github /></Link>
            <Link href="https://www.linkedin.com/in/simone-mineo-abc123/" target="_blank" rel="noreferrer" aria-label="LinkedIn profile"><Linkedin /></Link>
          </div>
        </div>
      </div>
      <section className={styles.aboutPreview} aria-labelledby="about-preview-heading">
        <div className={styles.aboutHeading}>
          <span>A little about me</span>
          <h2 id="about-preview-heading">Engineer by profession.<br />Builder by nature.</h2>
        </div>
        <p>I started my professional career in 2019 working across backend services, web interfaces and cloud delivery. I enjoy untangling complicated systems, making practical decisions and staying close enough to the work to build the solution myself.</p>
        <div className={styles.aboutLinks}>
          <Link href="/projects">My experience <span aria-hidden="true">→</span></Link>
          <Link href="/about">More about me <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </section>
  );
}
