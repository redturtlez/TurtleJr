"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "./catalog";
import styles from "./art.module.css";

interface GalleryGridProps {
  artworks: Artwork[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function GalleryGrid({ artworks, emptyTitle = "Photography coming soon", emptyDescription = "This collection is prepared for finished artwork and its story." }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedArtwork = selectedIndex === null ? undefined : artworks[selectedIndex];
  const isOpen = selectedIndex !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = priorOverflow; };
  }, [isOpen]);

  const close = (): void => setSelectedIndex(null);
  const move = (direction: number): void => {
    setSelectedIndex((current) => current === null ? null : (current + direction + artworks.length) % artworks.length);
  };

  return (
    <>
      {artworks.length === 0 ? (
        <div className={styles.emptyState}>
          <span aria-hidden="true">+</span>
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
        </div>
      ) : (
        <div className={styles.galleryGrid}>
          {artworks.map((artwork, index) => (
            <article className={styles.artworkCard} key={artwork.id}>
              <button type="button" className={styles.artworkButton} onClick={() => setSelectedIndex(index)} aria-label={`View ${artwork.title}`}>
                <span className={styles.artworkImage} style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }}>
                  <Image src={artwork.src} alt={artwork.alt} fill sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                </span>
                <span className={styles.artworkText}>
                  <strong>{artwork.title}</strong>
                  {artwork.description && <span>{artwork.description}</span>}
                  {artwork.dimensions && <span>{artwork.dimensions}</span>}
                  <small>View larger <i aria-hidden="true">↗</i></small>
                </span>
              </button>
            </article>
          ))}
        </div>
      )}

      <dialog ref={dialogRef} className={styles.lightbox} onClose={close} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby={selectedArtwork ? `artwork-${selectedArtwork.id}` : undefined}>
        {selectedArtwork && (
          <div className={styles.lightboxPanel}>
            <button type="button" className={styles.closeButton} onClick={close} aria-label="Close artwork viewer">×</button>
            <div className={styles.lightboxImage} style={{ aspectRatio: `${selectedArtwork.width} / ${selectedArtwork.height}` }}>
              <Image src={selectedArtwork.src} alt={selectedArtwork.alt} fill sizes="90vw" priority />
            </div>
            <div className={styles.lightboxCaption}>
              <p>Selected work</p>
              <h2 id={`artwork-${selectedArtwork.id}`}>{selectedArtwork.title}</h2>
              {selectedArtwork.description && <span>{selectedArtwork.description}</span>}
              {selectedArtwork.dimensions && <span>{selectedArtwork.dimensions}</span>}
            </div>
            {artworks.length > 1 && <div className={styles.lightboxControls}><button type="button" onClick={() => move(-1)}>← Previous</button><span>{selectedIndex! + 1} / {artworks.length}</span><button type="button" onClick={() => move(1)}>Next →</button></div>}
          </div>
        )}
      </dialog>
    </>
  );
}
