import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './selector.module.css';

export const metadata: Metadata = { title: 'Card Creators', description: 'Create custom Yu-Gi-Oh and Pokémon inspired trading cards.' };

export default function CardCreatorPage() {
  return <main className={styles.page}>
    <header><p className={styles.eyebrow}>THE CARD WORKSHOP</p><h1>Choose a card creator.</h1>
      <p>Build and download a custom card in your browser. Your artwork stays on your device.</p></header>
    <div className={styles.grid}>
      <Link href="/card-creator/yugioh" className={styles.card}>
        <span>01</span><h2>Yu-Gi-Oh Card Creator</h2><p>Monster, Spell, and Trap templates with print-ready PNG export.</p><strong>Open creator →</strong>
      </Link>
      <Link href="/card-creator/pokemon" className={styles.card}>
        <span>02</span><h2>Pokémon Card Creator</h2><p>Modern Basic, Stage 1, and Stage 2 Pokémon templates.</p><strong>Open creator →</strong>
      </Link>
    </div>
  </main>;
}
