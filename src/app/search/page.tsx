"use client";

import { useState } from "react";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: number;
  file_path: string;
  title: string;
  modified_at: string;
  category: string;
  snippet: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setSearching(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => doSearch(e.target.value)}
          autoFocus
        />
      </div>

      {searching && <p className="text-muted-foreground">Searching...</p>}

      {!searching && results.length === 0 && query.length >= 2 && (
        <p className="text-muted-foreground">No results found.</p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link
            key={r.id}
            href={`/notes/${r.file_path}`}
            className="block border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <h3 className="font-semibold">{r.title || "Untitled"}</h3>
            <p
              className="text-sm text-muted-foreground mt-1"
              dangerouslySetInnerHTML={{ __html: r.snippet }}
            />
            <span className="text-xs text-muted-foreground mt-2 block">
              {r.category} &middot; {new Date(r.modified_at).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
