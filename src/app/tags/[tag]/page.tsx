"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { NoteWithContent } from "@/types";

export default function TagPage() {
  const { tag } = useParams() as { tag: string };
  const [notes, setNotes] = useState<NoteWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tags`);
      const data = await res.json();
      // Fetch all notes and filter by tag client-side
      const notesRes = await fetch("/api/notes");
      const notesData = await notesRes.json();
      // For each note, fetch its tags
      const notesWithTags: NoteWithContent[] = [];
      for (const note of notesData.notes ?? []) {
        const noteRes = await fetch(`/api/notes/${note.file_path}`);
        const noteData = await noteRes.json();
        if (noteData.note && noteData.note.tags?.includes(tag)) {
          notesWithTags.push(noteData.note);
        }
      }
      setNotes(notesWithTags);
      setLoading(false);
    }
    load();
  }, [tag]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Notes tagged <Badge variant="secondary">#{tag}</Badge>
      </h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-muted-foreground">No notes with this tag.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.file_path}`}
              className="block border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <h3 className="font-semibold">{note.title || "Untitled"}</h3>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {note.content_preview}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
