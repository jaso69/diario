import type { Source } from "@/lib/types";

/** Páginas que la respuesta cita con el formato [Título, p. N], en el orden de recuperación y sin duplicados. */
export function citedSources(answer: string, hits: Source[]): Source[] {
  const cited = new Set<string>();
  for (const m of answer.matchAll(/\[([^\]]+?),\s*p(?:ág(?:ina)?)?\.?\s*(\d+)\]/gi)) {
    cited.add(`${m[1].trim().toLowerCase()}|${m[2]}`);
  }
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.manual_id}:${h.page}`;
    if (seen.has(key) || !cited.has(`${h.title.trim().toLowerCase()}|${h.page}`)) return false;
    seen.add(key);
    return true;
  });
}
