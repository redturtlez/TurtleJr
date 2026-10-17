import { generateMetadata } from "../../lib/server";
import Content from "./content";
import styles from "./projects.module.css";

export const metadata = generateMetadata({ title: "Projects" });

export default function ProjectsPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}><p>Work log / selected experience</p><h1>Things I&apos;ve helped<br /><span>move forward.</span></h1></header>
      <Content />
    </section>
  );
}
