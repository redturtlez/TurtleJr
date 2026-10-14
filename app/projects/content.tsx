"use client";

import { Arrow } from "public/svg";
import { useState } from "react";
import styles from "./projects.module.css";

const jobs = [
  { title: "Mphasis · FedEx Ground", date: "Mar. 2021 – Present", desc: `Led development of enterprise-scale microservices using Java, Spring Boot, JMS, Redis, and Cassandra for logistics systems processing up to 100M+ packages per day.

Architected queue-based messaging and caching flows across FedEx and USPS integrations. Directed a team of 10 engineers, managed sprint planning, and worked with stakeholders on delivery strategy.

Drove CI/CD migration from Jenkins to GitHub Actions and delivered production APIs with integration tests and documentation.`, url: "/about" },
  { title: "Infosys · AT&T", date: "Jul. 2019 – Mar. 2020", desc: `Modernized invoicing applications processing roughly 10,000 daily transactions by upgrading Java Spring 3 to Spring 5 and refactoring backend MVC components and tests.

Replaced deprecated Java and Spring patterns with maintainable equivalents and documented the system for long-term support. Collaborated in an Agile team across Angular and Oracle SQL.`, url: "/about" },
  { title: "Revature", date: "Feb. 2019 – Jul. 2019", desc: `Developed the backend of RideForce, an internal ride-sharing application built with Java, Spring Boot, and Oracle SQL for approximately 500 employees.

Built MVC and database layers, wrote JUnit tests, contributed to the Angular interface, and implemented route matching logic with Google Maps. Supported CI/CD and cloud deployments using Jenkins, Git, Gradle, AWS, and Docker.`, url: "/about" },
];

const personal = [
  { title: "Turtle Jr", date: "Apr. 2023 – Present", desc: `TurtleJr.dev is a mobile-first portfolio and progressive web app built with Next.js, TypeScript, and Tailwind CSS.

The platform combines a professional portfolio with public creative tools and a secure personal workspace for tasks, health, and budgeting. It is an ongoing product experiment in component-driven design, practical engineering, and continuous improvement.`, url: "/about" },
];

export default function Content() {
  const [tab, setTab] = useState<"professional" | "personal">("professional");
  const [indexes, setIndexes] = useState({ professional: 0, personal: 0 });
  const list = tab === "professional" ? jobs : personal;
  const currentIndex = indexes[tab];
  const item = list[currentIndex] ?? list[0]!;

  const changePage = (direction: number): void => {
    setIndexes((current) => ({ ...current, [tab]: (current[tab] + direction + list.length) % list.length }));
  };

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Project category">
          <button type="button" role="tab" aria-selected={tab === "professional"} className={tab === "professional" ? styles.activeTab : undefined} onClick={() => setTab("professional")}>Professional</button>
          <button type="button" role="tab" aria-selected={tab === "personal"} className={tab === "personal" ? styles.activeTab : undefined} onClick={() => setTab("personal")}>Personal</button>
        </div>
        <div className={styles.pager}>
          <span>{String(currentIndex + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}</span>
          <button type="button" className={styles.previous} onClick={() => changePage(-1)} aria-label="Previous project"><Arrow /></button>
          <button type="button" className={styles.next} onClick={() => changePage(1)} aria-label="Next project"><Arrow /></button>
        </div>
      </div>
      <article className={styles.card}>
        <div className={styles.summary}><small>{tab === "professional" ? "Professional experience" : "Personal project"}</small><h2>{item.title}</h2><time>{item.date}</time><a href={item.url}>Read more <span aria-hidden="true">↗</span></a></div>
        <div className={styles.description}>{item.desc}</div>
      </article>
      <div className={styles.dots} aria-hidden="true">{list.map((entry, index) => <i key={entry.title} className={index === currentIndex ? styles.activeDot : undefined} />)}</div>
    </div>
  );
}
