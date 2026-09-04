/* Tiny module-level event bus for celebration moments.
   Store actions call celebrate() when something rewarding happens
   (GrowthProof issued, result confirmed); the UI listens and renders
   a confetti overlay. Kept out of components/ so lib code can use it
   without circular imports. */

export interface Celebration {
  id: number;
  emoji: string;
  title: string;
  sub?: string;
}

let nextId = 0;
let listener: ((c: Celebration) => void) | null = null;

export function celebrate(emoji: string, title: string, sub?: string) {
  listener?.({ id: ++nextId, emoji, title, sub });
}

export function onCelebrate(fn: (c: Celebration) => void) {
  listener = fn;
}