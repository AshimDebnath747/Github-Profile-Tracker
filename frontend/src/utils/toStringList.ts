function parseArrayString(value: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? toStringList(parsed) : null;
  } catch {
    return null;
  }
}

export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      if (typeof item !== 'string' || !item.trim()) return [];
      return parseArrayString(item) ?? [item.trim()];
    });
  }
  if (typeof value !== 'string' || !value.trim()) return [];

  const parsedArray = parseArrayString(value.trim());
  if (parsedArray) return parsedArray;
  return value.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}
