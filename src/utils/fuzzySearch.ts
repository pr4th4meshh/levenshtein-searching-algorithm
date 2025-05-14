import { levenshtein } from "./levenshtein";

const cache = new Map();

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim();
}

function generateNGrams(words: string[], maxN = 3): string[] {
  const nGrams: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      nGrams.push(words.slice(i, i + n).join(" "));
    }
  }
  return nGrams;
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  keys: (keyof T)[],
  threshold?: number,
  limit = 5
): T[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 3) return []; 

  const effectiveThreshold = threshold ?? Math.max(3, Math.floor(normalizedQuery.length * 0.45));
  const cacheKey = `${normalizedQuery}-${effectiveThreshold}-${limit}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const queryWords = normalizedQuery.split(/\s+/);

  const results = items
    .map(item => {
      let bestScore = Infinity;

      for (const key of keys) {
        const fieldValue = normalize(String(item[key]));
        if (!fieldValue) continue;

        if (fieldValue === normalizedQuery) return { item, score: 0 };
        if (fieldValue.startsWith(normalizedQuery)) return { item, score: 1 };
        if (fieldValue.includes(normalizedQuery)) bestScore = Math.min(bestScore, 2);

        const fieldWords = fieldValue.split(/\s+/);
        const nGrams = generateNGrams(fieldWords, queryWords.length + 1);

        for (const phrase of nGrams) {
          const dist = levenshtein(phrase, normalizedQuery);
          bestScore = Math.min(bestScore, dist);
        }

        const fullDist = levenshtein(fieldValue, normalizedQuery);
        bestScore = Math.min(bestScore, fullDist);
      }

      return { item, score: bestScore };
    })
    .filter(result => result.score <= effectiveThreshold)
    .sort((a, b) => a.score - b.score)
    .map(result => result.item)
    .slice(0, limit);

  cache.set(cacheKey, results);
  return results;
}
