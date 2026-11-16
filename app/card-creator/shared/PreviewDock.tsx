'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

const DOCK_REFRESH_MS = 300;

/**
 * Phone-only floating thumbnail. It appears once the main preview scrolls out of view,
 * mirrors the live canvas, and scrolls back to the full preview when tapped.
 * Hidden entirely (display: none) at wider widths via the shared stylesheet.
 */
export default function PreviewDock({ source, stage, classes }: {
  source: RefObject<HTMLCanvasElement | null>;
  stage: RefObject<HTMLElement | null>;
  classes: Record<string, string>;
}) {
  const [visible, setVisible] = useState(false);
  const mini = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const target = stage.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { const entry = entries[entries.length - 1]; if (entry) setVisible(!entry.isIntersecting); }, { threshold: 0.05 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [stage]);

  useEffect(() => {
    if (!visible) return;
    const draw = () => {
      const from = source.current, to = mini.current;
      if (!from || !to || !from.width || !from.height) return;
      const width = 152; // 2x the 76px dock for sharp thumbnails
      const height = Math.round(width * from.height / from.width);
      if (to.width !== width || to.height !== height) { to.width = width; to.height = height; }
      const context = to.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, width, height);
      context.imageSmoothingQuality = 'high';
      context.drawImage(from, 0, 0, width, height);
    };
    draw();
    const timer = window.setInterval(draw, DOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [visible, source]);

  return <button type="button" className={`${classes.dock} ${visible ? classes.dockVisible : ''}`}
    aria-label="Back to full card preview" tabIndex={visible ? 0 : -1} aria-hidden={!visible}
    onClick={() => stage.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })}>
    <canvas ref={mini} aria-hidden="true" />
    <span aria-hidden="true">Preview ↑</span>
  </button>;
}
