import { generateMetadata } from "../../lib/server";
import Content from "./content";
import styles from "./projects.module.css";

export const metadata = generateMetadata({ title: "Projects" });

export default function ProjectsPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}><p>Selected experience</p><h1>Work with<br /><span>real-world impact.</span></h1></header>
      <Content />
    </section>
  );
}
