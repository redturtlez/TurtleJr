import Image from "next/image";
import Link from "next/link";
import { generateMetadata } from "../../lib/server";
import { artCatalog, getCategory, getCategoryArtworks, getFeaturedArtwork } from "./catalog";
import styles from "./art.module.css";

export const metadata = generateMetadata({
  title: "Art",
  description: "A growing collection of handmade cards, painted pieces, mosaics, and dimensional artwork by Turtle Jr.",
});

export default function ArtPage() {
  const featured = getFeaturedArtwork();
  const featuredCategory = featured ? getCategory(featured.category) : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Handmade work / ongoing collection</p>
        <h1>Art made to be<br /><span>held, painted, and seen.</span></h1>
        <p className={styles.intro}>A growing archive of custom trading cards, painted extensions, mosaics, 3D-printed work, and larger experiments. Each collection keeps the finished piece close to the process behind it.</p>
      </header>

      <section className={styles.featuredSection} aria-labelledby="featured-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Featured work</p><h2 id="featured-heading">The piece at the top of the studio.</h2></div>
        {featured ? (
          <Link href={`/art/${featured.category}`} className={styles.featuredCard}>
            <span className={styles.featuredImage} style={{ aspectRatio: `${featured.width} / ${featured.height}` }}><Image src={featured.src} alt={featured.alt} fill sizes="(max-width: 760px) 100vw, 60vw" priority /></span>
            <span className={styles.featuredCopy}><small>{featuredCategory?.title ?? "Featured artwork"}</small><strong>{featured.title}</strong>{featured.description && <span>{featured.description}</span>}<b>View the collection ↗</b></span>
          </Link>
        ) : (
          <div className={styles.featuredPlaceholder}>
            <span className={styles.featuredScale}>3 × 4 ft</span>
            <div><small>Reserved featured position</small><h3>Large-format canvas in progress</h3><p>Your three-foot by four-foot painting will lead this page when its photograph and story are ready.</p></div>
          </div>
        )}
      </section>

      <section className={styles.collections} aria-labelledby="collections-heading">
        <div className={styles.sectionHeading}><p className={styles.eyebrow}>Browse by collection</p><h2 id="collections-heading">Six ways into the work.</h2></div>
        <div className={styles.categoryGrid}>
          {artCatalog.categories.map((category) => {
            const categoryArtworks = getCategoryArtworks(category.slug);
            const preview = categoryArtworks[0];
            return (
              <Link href={`/art/${category.slug}`} className={styles.categoryCard} key={category.slug}>
                <span className={styles.categoryVisual}>
                  {preview ? <Image src={preview.src} alt="" fill sizes="(max-width: 680px) 100vw, 50vw" /> : <i aria-hidden="true">{category.number}</i>}
                </span>
                <span className={styles.categoryCopy}><small>{category.number} / {String(categoryArtworks.length).padStart(2, "0")} works</small><strong>{category.title}</strong><span>{category.description}</span><b>Open collection →</b></span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
