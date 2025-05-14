import React, { useState, useEffect } from "react";
import { fuzzySearch } from "../utils/fuzzySearch";
import { useDebounce } from "../hooks/useDebounce";

interface Item {
  id: number;
  title: string;
  description: string;
}

const FuzzySearchOptimized: React.FC = () => {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    fetch("./src/generated_items.json")
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error("Failed to load items:", err));
  }, []);

  const results = fuzzySearch(items, debouncedQuery, ["title", "description"]);

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
