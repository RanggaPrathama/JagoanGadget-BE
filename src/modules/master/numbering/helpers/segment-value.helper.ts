import { TypePrefix } from '../entities/prefix.entity';

/** Minimal shape of a resolved prefix needed to render one segment. */
export interface PrefixLike {
  type: TypePrefix;
  value: string;
}

/**
 * Render one segment. SEQUENCE shows last+1 zero-padded to the stored width
 * (pure — never persists). Date types come from `now`. TEXT echoes value.
 */
export function renderSegment(prefix: PrefixLike, now: Date): string {
  switch (prefix.type) {
    case TypePrefix.SEQUENCE: {
      const width = Math.max(prefix.value.length, 1);
      const next = (Number.parseInt(prefix.value, 10) || 0) + 1;
      return String(next).padStart(width, '0');
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
