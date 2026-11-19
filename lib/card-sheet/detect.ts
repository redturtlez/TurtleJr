import { INPUT_BLEEDS, KINDS_BY_MODE, cardFrame, type CardKind, type InputBleed } from "./geometry";

export interface CardGuess {
  kind: CardKind;
  bleed: InputBleed;
}
/** Largest relative aspect-ratio difference still accepted as a match (the closest candidates differ by about 1%). */
const TOLERANCE = 0.004;

/**
 * Guesses the card type and the bleed already in an image from its proportions alone, by comparing against the six
 * possible shapes (Pokémon or Yu-Gi-Oh, with 0, 1 or 2 mm of bleed). Returns null when nothing matches closely, so a
 * cropped scan or another card game is never labelled wrongly; the user then chooses. A guess is only a starting
 * point and can always be changed. Jumbo cards have almost the same proportions as regular ones, so they are only ever
 * guessed when asked for explicitly (the jumbo sheet passes its own kind); the default candidates never include them.
 */
export function guessCard(width: number, height: number, kinds: readonly CardKind[] = KINDS_BY_MODE.standard): CardGuess | null {
  if (!(width > 0 && height > 0)) return null;
  const ratio = width / height;
  let best: { guess: CardGuess; error: number } | null = null;
  for (const kind of kinds) {
    for (const bleed of INPUT_BLEEDS) {
      const frame = cardFrame(kind, bleed);
      const error = Math.abs(ratio - frame.sourceWidthMm / frame.sourceHeightMm) / ratio;
      if (!best || error < best.error) best = { guess: { kind, bleed }, error };
    }
  }
  return best && best.error <= TOLERANCE ? best.guess : null;
}
