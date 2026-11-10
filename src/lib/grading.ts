export type Band = { grade: string; min: number; max: number; remark: string };

export function gradeFor(total: number, bands: Band[]): Band {
  const t = Math.round(total);
  return bands.find((b) => t >= b.min && t <= b.max) ?? { grade: "-", remark: "", min: 0, max: 0 };
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Competition ranking ("1, 2, 2, 4") from a map of id to score. */
export function rank<K>(scores: Map<K, number>): Map<K, number> {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const out = new Map<K, number>();
  sorted.forEach(([k, v], i) => {
    const prev = sorted[i - 1];
    out.set(k, prev && prev[1] === v ? out.get(prev[0])! : i + 1);
  });
  return out;
}

export function parseComponents(json: string): Record<string, number> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
