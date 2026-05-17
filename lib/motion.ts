import type { Transition, Variants } from "framer-motion";

/** Default spring for hover / press micro-motion. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 28,
};

/** Spring for wizard step transitions. */
export const springStage: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 30,
  mass: 1,
};

/** Spring for cream-paper document reveal. */
export const springPaper: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 24,
};

export const easeOutQuint = [0.22, 1, 0.36, 1] as const;
export const easeStage = [0.16, 1, 0.3, 1] as const;

export const durations = {
  fast: 0.12,
  base: 0.2,
  slow: 0.42,
  cine: 0.7,
} as const;

// framer-motion's Transition['ease'] expects a tuple but the literal
// `as const` arrays we export are narrower than what TS lets us pass
// without coercion. Re-check this cast on the next framer-motion upgrade.
/** Fade-up entrance used by page roots and modals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easeOutQuint as unknown as number[] },
  },
};

/** Stage-style reveal for content swaps (wizard step changes). */
export const stageReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easeStage as unknown as number[] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: durations.base, ease: easeStage as unknown as number[] },
  },
};

/** Stagger children for parents with multiple animated items. */
export const staggerChildren: Variants = {
  visible: { transition: { staggerChildren: 0.04 } },
};
