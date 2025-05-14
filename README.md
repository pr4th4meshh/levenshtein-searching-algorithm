# Fuzzy Search Implementation

This repository contains a complete implementation of a fuzzy search system with React integration. The system uses the Levenshtein distance algorithm to find approximate string matches, making it robust against typos and partial matches.

## Table of Contents

- [Levenshtein Distance Algorithm](#levenshtein-distance-algorithm)
- [Fuzzy Search Utility](#fuzzy-search-utility)
- [React Component Implementation](#react-component-implementation)
- [Hooks](#hooks)

## Levenshtein Distance Algorithm

The Levenshtein distance measures the minimum number of single-character edits (insertions, deletions, or substitutions) required to change one string into another.

```
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  // handle edge cases for empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // create a matrix of size (m+1) x (n+1) to store the distances
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));

  // initialize the first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // fill the matrix using dynamic programming approach
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      // if characters match, no additional cost
      // otherwise, take the minimum of three operations:
      // 1. replace (diagonal)
      // 2. insert (from left)
      // 3. delete (from above)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(
              dp[i - 1][j - 1] + 1, // substitution
              dp[i][j - 1] + 1,     // insertion
              dp[i - 1][j] + 1      // deletion
            );
    }
  }

  // the bottom-right cell contains the final distance
  return dp[m][n];
}
```

## Fuzzy Search Utility

The fuzzy search utility uses the Levenshtein algorithm along with several optimization techniques to efficiently find matches.

```
import { levenshtein } from "./levenshtein";

// cache to store previous search results for performance
const cache = new Map();

// normalize text by converting to lowercase and removing special characters
function normalize(str: string): string {
  return str.toLowerCase().replace(/\[^a-z0-9 ]+/g, "").trim();
}

// generate n-grams (word sequences) from an array of words
// this helps with partial matching of phrases
function generateNGrams(words: string[], maxN = 3): string[] {
  const nGrams: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      nGrams.push(words.slice(i, i + n).join(" "));
    }
  }
  return nGrams;
}

// main fuzzy search function that works with any type of items
export function fuzzySearch<T>(
  items: T[],                // array of items to search through
  query: string,             // search query
  keys: (keyof T)[],         // which properties of items to search in
  threshold?: number,        // maximum allowed distance (auto-calculated if not provided)
  limit = 5                  // maximum number of results to return
): T[] {
  // normalize the query for consistent matching
  const normalizedQuery = normalize(query);
  
  // skip short queries for performance and to avoid too many matches
  if (normalizedQuery.length < 3) return [];

  // calculate threshold based on query length if not provided
  const effectiveThreshold = threshold ?? Math.max(3, Math.floor(normalizedQuery.length * 0.45));
  
  // create a cache key based on search parameters
  const cacheKey = `${normalizedQuery}-${effectiveThreshold}-${limit}`;
  
  // return cached results if available
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // split query into words for more flexible matching
  const queryWords = normalizedQuery.split(/\s+/);

  // process each item and calculate its match score
  const results = items
    .map(item => {
      let bestScore = Infinity;

      // check each specified field of the item
      for (const key of keys) {
        const fieldValue = normalize(String(item[key]));
        if (!fieldValue) continue;

        // exact match gets highest priority (score 0)
        if (fieldValue === normalizedQuery) return { item, score: 0 };
        
        // prefix match gets second highest priority (score 1)
        if (fieldValue.startsWith(normalizedQuery)) return { item, score: 1 };
        
        // substring match gets third highest priority (score 2)
        if (fieldValue.includes(normalizedQuery)) bestScore = Math.min(bestScore, 2);

        // split field into words and generate n-grams for phrase matching
        const fieldWords = fieldValue.split(/\s+/);
        const nGrams = generateNGrams(fieldWords, queryWords.length + 1);

        // check each n-gram against the query using levenshtein distance
        for (const phrase of nGrams) {
          const dist = levenshtein(phrase, normalizedQuery);
          bestScore = Math.min(bestScore, dist);
        }

        // also check the entire field value against the query
        const fullDist = levenshtein(fieldValue, normalizedQuery);
        bestScore = Math.min(bestScore, fullDist);
      }

      // return the item with its best match score
      return { item, score: bestScore };
    })
    // filter out items with scores above the threshold
    .filter(result => result.score <= effectiveThreshold)
    // sort by score (lower is better)
    .sort((a, b) => a.score - b.score)
    // extract just the items
    .map(result => result.item)
    // limit the number of results
    .slice(0, limit);

  // cache the results for future use
  cache.set(cacheKey, results);
  return results;
}
```

## React Component Implementation

This React component demonstrates how to use the fuzzy search utility in a real application.

```
import React, { useState, useEffect } from "react";
import { fuzzySearch } from "../utils/fuzzySearch";
import { useDebounce } from "../hooks/useDebounce";

// define the structure of items we'll be searching
interface Item {
  id: number;
  title: string;
  description: string;
}

const FuzzySearchOptimized: React.FC = () => {
  // state for the search query input
  const [query, setQuery] = useState("");
  
  // state to store the items loaded from the json file
  const [items, setItems] = useState<Item[]>([]);
  
  // debounce the query to avoid excessive searches while typing
  const debouncedQuery = useDebounce(query, 300);

  // load items from a json file when the component mounts
  useEffect(() => {
    fetch("./src/generated_items.json")
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error("Failed to load items:", err));
  }, []);

  // perform the fuzzy search using our utility
  const results = fuzzySearch(items, debouncedQuery, ["title", "description"]);

  // render the search input and results
  return (
    <div className="p-4">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
        className="border p-2 rounded w-full"
      />
      <ul className="mt-4 space-y-2">
        {results.map(item => (
          <li key={item.id} className="p-2 bg-gray-100 rounded">
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </li>
        ))}
        {results.length === 0 && <li>No matches found.</li>}
      </ul>
    </div>
  );
};

export default FuzzySearchOptimized;
```

## Hooks

### useDebounce

The `useDebounce` hook delays the update of a value until a specified time has passed since the last change. This is useful for preventing excessive operations during rapid changes, such as when typing in a search box.

```
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  // state to hold the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // clear the timeout if the value changes before the delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Performance Considerations

1. **Caching**: The fuzzy search implementation uses a cache to avoid recalculating results for the same query.
2. **Debouncing**: The React component uses debouncing to prevent excessive searches while the user is typing.
3. **Early Returns**: Short queries are skipped to improve performance.
4. **Efficient Data Structures**: The Levenshtein algorithm uses typed arrays for better memory efficiency.
5. **Prioritized Matching**: Exact matches, prefix matches, and substring matches are prioritized before calculating Levenshtein distances.

## Usage

To use this fuzzy search in your application:

1. Import the `fuzzySearch` & `levenshtein` function
2. Define the items you want to search through
3. Specify which properties of the items should be searched
4. Optionally set a custom threshold and result limit
5. Use the returned filtered and sorted items in your UI
