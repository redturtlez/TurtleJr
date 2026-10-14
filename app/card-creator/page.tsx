import type { Metadata } from "next";
import Link from "next/link";
import styles from "./selector.module.css";

export const metadata: Metadata = { title: "Card Creators", description: "Create custom Yu-Gi-Oh and Pokémon inspired trading cards." };

const creators = [
  { href: "/card-creator/yugioh", number: "01", label: "Yu-Gi-Oh", title: "Yu-Gi-Oh Card Creator", description: "Build Monster, Spell, and Trap cards with calibrated typography and print-ready export.", tags: ["9 templates", "300 PPI", "Optional bleed"], className: styles.yugioh },
  { href: "/card-creator/pokemon", number: "02", label: "Pokémon", title: "Pokémon Card Creator", description: "Create cards across classic and modern eras, including full-art and ex layouts.", tags: ["Multiple eras", "Full art", "Print export"], className: styles.pokemon },
] as const;

export default function CardCreatorPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>The Card Studio</p>
        <h1>Pick a universe.<br /><span>Make it yours.</span></h1>
        <p>Design and export custom cards entirely in your browser. Uploaded artwork stays on your device.</p>
      </header>
      <div className={styles.grid}>
        {creators.map((creator) => (
          <Link key={creator.href} href={creator.href} className={`${styles.card} ${creator.className}`}>
            <div className={styles.cardTop}><span>{creator.number}</span><small>{creator.label}</small></div>
            <div className={styles.cardVisual} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.cardContent}><h2>{creator.title}</h2><p>{creator.description}</p><div className={styles.tags}>{creator.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
            <strong>Open creator <span aria-hidden="true">↗</span></strong>
          </Link>
        ))}
      </div>
      <p className={styles.privacy}><span /> Local-first editing · No artwork upload required</p>
    </section>
  );
}
