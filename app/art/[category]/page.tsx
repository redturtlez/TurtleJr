import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { artCatalog, getCategory, getCategoryArtworks } from "../catalog";
import GalleryGrid from "../GalleryGrid";
import styles from "../art.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return artCatalog.categories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  return category ? { title: `${category.title} | Turtle Jr`, description: category.description } : {};
}

export default async function ArtCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const artworks = getCategoryArtworks(category.slug);

  return (
    <div className={styles.page}>
      <header className={styles.categoryHeader}>
        <Link href="/art" className={styles.backLink}>← All art</Link>
        <p className={styles.eyebrow}>Collection {category.number}</p>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
        <span>{artworks.length === 1 ? "1 photographed work" : `${artworks.length} photographed works`}</span>
      </header>

      <nav className={styles.categoryNav} aria-label="Art collections">
        {artCatalog.categories.map((entry) => <Link key={entry.slug} href={`/art/${entry.slug}`} aria-current={entry.slug === category.slug ? "page" : undefined}>{entry.shortTitle}</Link>)}
      </nav>

      <section className={styles.categoryGallery} aria-label={`${category.title} artwork`}>
        <GalleryGrid artworks={artworks} emptyTitle={`${category.shortTitle} coming soon`} emptyDescription="The collection is ready for photographs, titles, and optional notes about each finished piece." />
      </section>
    </div>
  );
}
