/**
 * The stream that the page loads when its address gives none.
 * It comes from `VITE_DEFAULT_STREAM_URL`, which Vite reads in `.env` when it builds the site (see `.env.example`).
 * An empty or missing value makes the page open with no stream.
 */
export const DEFAULT_STREAM_URL: string = import.meta.env.VITE_DEFAULT_STREAM_URL ?? '';
