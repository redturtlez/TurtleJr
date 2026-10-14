import { generateMetadata } from "../../lib/server";
import Content from "./content";
import styles from "./protein-cost.module.css";

export const metadata = generateMetadata({ title: "Protein Cost", description: "Compare foods and supplements by protein value." });

export default function ProteinCostPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>Nutrition utility</p>
        <div><h1>Protein<br /><span>value calculator.</span></h1><p className={styles.intro}>Compare foods and supplements by how many grams of protein each dollar buys.</p></div>
      </header>
      <Content />
    </section>
  );
}
