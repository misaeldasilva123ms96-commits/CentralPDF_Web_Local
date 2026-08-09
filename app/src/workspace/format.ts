/**
 * Formats a byte count using an appropriate byte-size unit.
 *
 * @param bytes - The byte count to format
 * @returns The formatted byte count, or `—` for non-finite or negative values
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB'];
  let value = bytes;
  let unit = 'B';
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

/**
 * Formats a duration as milliseconds or seconds.
 *
 * @param ms - The duration in milliseconds
 * @returns The formatted duration, or `—` for invalid or negative values
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Calculates the percentage reduction from input bytes to output bytes.
 *
 * @param bytesIn - The original byte count
 * @param bytesOut - The resulting byte count
 * @returns The rounded reduction percentage, or `0` when `bytesIn` is zero or negative
 */
export function percentReduction(bytesIn: number, bytesOut: number): number {
  if (!bytesIn || bytesIn <= 0) return 0;
  return Math.max(0, Math.round((1 - bytesOut / bytesIn) * 100));
}