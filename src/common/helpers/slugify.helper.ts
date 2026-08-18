/**
 * Convert a human-readable name into a lowercase dash-separated slug.
 * Example: "View Users" → "view-users", "User Management" → "user-management"
 */
export const slugifyName = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, '-');
