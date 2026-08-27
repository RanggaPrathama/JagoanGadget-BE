import { TypePrefix } from '../entities/prefix.entity';

/** Minimal shape of a resolved prefix needed to render one segment. */
export interface PrefixLike {
  type: TypePrefix;
  value: string;
}

/**
 * Render one segment. SEQUENCE shows a zero-padded sample based on the
 * configured width (value holds the digit count, e.g. "4" -> "0001"; pure —
 * never reads/consumes a counter). Date types come from `now`. TEXT echoes value.
 */
export function renderSegment(prefix: PrefixLike, now: Date): string {
  switch (prefix.type) {
    case TypePrefix.SEQUENCE: {
      const width = sequenceWidth(prefix.value);
      return '1'.padStart(width, '0');
    }
    case TypePrefix.YEAR:
      return String(now.getFullYear());
    case TypePrefix.MONTH:
      return String(now.getMonth() + 1).padStart(2, '0');
    case TypePrefix.DAY:
      return String(now.getDate()).padStart(2, '0');
    default:
      return prefix.value; // TEXT
  }
}

/**
 * Resolve the sequence digit-count from a prefix value. The value holds the
 * number of digits ("4" -> 4), NOT the current counter. Falls back to 4.
 */
export function sequenceWidth(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : 4;
}

/** Sorted-by-index segments (with .prefix loaded) -> full example string. */
export function buildPreview(
  segments: { index: number; prefix: PrefixLike }[],
  now: Date = new Date(),
): string {
  return [...segments]
    .sort((a, b) => a.index - b.index)
    .map((s) => renderSegment(s.prefix, now))
    .join('');
}
