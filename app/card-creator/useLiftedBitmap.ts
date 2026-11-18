"use client";
import { useEffect, useState } from "react";
import { liftBitmap } from "../../lib/card-sheet/shadow-canvas";
import type { ShadowLevel } from "../../lib/card-sheet/shadow";

/**
 * The artwork with the clear sticker shadow lift applied, for the live preview. Returns the original bitmap while the
 * lift is off or still being computed, so the preview never waits on it. The lifted copy is closed when it is replaced.
 */
export function useLiftedBitmap(source: ImageBitmap | null, level: ShadowLevel, enabled: boolean): ImageBitmap | null {
  const [lifted, setLifted] = useState<{ source: ImageBitmap; level: ShadowLevel; bitmap: ImageBitmap } | null>(null);
  const active = Boolean(source) && enabled && level > 0;
  useEffect(() => {
    if (!source || !active) {
      setLifted(null);
      return;
    }
    let cancelled = false;
    let made: ImageBitmap | null = null;
    liftBitmap(source, level)
      .then((bitmap) => {
        if (cancelled) {
          if (bitmap !== source) bitmap.close();
          return;
        }
        made = bitmap;
        setLifted({ source, level, bitmap });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (made && made !== source) made.close();
    };
  }, [source, level, active]);
  return active && lifted && lifted.source === source && lifted.level === level ? lifted.bitmap : source;
}
