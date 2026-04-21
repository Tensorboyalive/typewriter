/**
 * Centralized brand palette in RGB tuples, for surfaces (PDF, SVG text rendering,
 * canvas output) that can't read CSS variables at runtime.
 *
 * Keep in sync with src/index.css `:root` primitives. When editing a color here,
 * find-and-update the matching --color-* token in globals.
 */

type RGB = readonly [number, number, number]

/** #0A0A0A */
export const BRAND_INK: RGB = [10, 10, 10]

/** #1E1E1E — one rung up from pure ink, used for soft body text in neutral output. */
export const BRAND_INK_SOFT: RGB = [30, 30, 30]

/** #6B6660 — the editorial warm muted gray (used for captions, eyebrows on light surfaces). */
export const BRAND_MUTED: RGB = [107, 102, 96]

/** #F3EEE2 — cream canvas. */
export const BRAND_CREAM: RGB = [243, 238, 226]

/** #E85D1C — viral orange accent. Use for inline links, emphasis, single-accent rules. */
export const BRAND_VIRAL: RGB = [232, 93, 28]
