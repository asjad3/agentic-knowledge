"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { MDXEditor } from "@mdxeditor/editor";
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  CodeToggle,
  InsertCodeBlock,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  imagePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Save, Loader2, Plus } from "lucide-react";
import type { Note, NoteWithContent } from "@/types";

export default function NotesPage() {
  const params = useParams();
  const router = useRouter();
  const slugs = params.slugs as string[] | undefined;

  // Editor state
  const [note, setNote] = useState<NoteWithContent | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);

  // List state
  const [notes, setNotes] = useState<Note[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");

  if (slugs && slugs.length > 0) {
    return (
      <NoteEditor
        slugs={slugs}
        note={note}
        setNote={setNote}
        content={content}
        setContent={setContent}
        loading={loading}
        setLoading={setLoading}
        saving={saving}
        setSaving={setSaving}
        savingError={savingError}
        setSavingError={setSavingError}
        router={router}
      />
    );
  }

  const filtered = search
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content_preview.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Notes</h1>
        <Button onClick={() => setNewNoteOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Filter notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {listLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No notes yet.</p>
          <p className="text-sm text-muted-foreground">Create a note to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => router.push(`/notes/${n.file_path}`)}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <h3 className="font-semibold">{n.title || "Untitled"}</h3>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {n.content_preview}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {n.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.modified_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {newNoteOpen && (
        <NewNoteDialog
          onClose={() => {
            setNewNoteOpen(false);
            setNewNoteTitle("");
          }}
          title={newNoteTitle}
          setTitle={setNewNoteTitle}
          onCreated={(filePath) => {
            setNewNoteOpen(false);
            setNewNoteTitle("");
            router.push(`/notes/${filePath}`);
          }}
        />
      )}
    </div>
  );
}

function NoteEditor({
  slugs,
  note,
  setNote,
  content,
  setContent,
  loading,
  setLoading,
  saving,
  setSaving,
  savingError,
  setSavingError,
  router,
}: {
  slugs: string[];
  note: NoteWithContent | null;
  setNote: (n: NoteWithContent | null) => void;
  content: string;
  setContent: (s: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  savingError: string | null;
  setSavingError: (s: string | null) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const loadNote = useCallback(() => {
    setLoading(true);
    fetch(`/api/notes/${slugs.join("/")}`)
      .then((r) => {
        if (!r.ok) throw new Error("Note not found");
        return r.json();
      })
      .then((data) => {
        const n = data.note;
        setNote(n);
        let fullContent = n.content ?? "";
        if (n.frontmatter && Object.keys(n.frontmatter).length > 0) {
          fullContent = `---\n${Object.entries(n.frontmatter)
            .map(([k, v]) => `${k}: ${typeof v === "string" ? `"${v}"` : JSON.stringify(v)}`)
            .join("\n")}\n---\n\n${fullContent}`;
        }
        setContent(fullContent);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setNote(null);
      });
  }, [slugs]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  const handleSave = useCallback(async () => {
    if (!note || saving) return;
    setSaving(true);
    setSavingError(null);

    try {
      const res = await fetch(`/api/notes/${note.file_path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setNote(data.note);
      setSavingError(null);
    } catch (e: unknown) {
      setSavingError(String(e));
    } finally {
      setSaving(false);
    }
  }, [note, content, saving]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-lg text-muted-foreground">Note not found</p>
        <Button onClick={() => router.push("/notes")} variant="outline">
          Back to Notes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/notes")}>
            ←
          </Button>
          <h1 className="font-semibold truncate max-w-md">{note.title || "Untitled"}</h1>
          {note.category && <Badge variant="secondary">{note.category}</Badge>}
          {savingError && <span className="text-xs text-red-500">{savingError}</span>}
          {saving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Save
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <MDXEditor
          markdown={content}
          onChange={(val) => setContent(val)}
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
            codeMirrorPlugin({ codeBlockLanguages: { js: "JavaScript", ts: "TypeScript", python: "Python", css: "CSS", bash: "Bash" } }),
            tablePlugin(),
            imagePlugin(),
            frontmatterPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <InsertCodeBlock />
                  <InsertTable />
                  <ListsToggle />
                  <CreateLink />
                  <InsertImage />
                  <InsertThematicBreak />
                </>
              ),
            }),
          ]}
          className="h-full w-full"
          contentEditableClassName="prose prose-sm dark:prose-invert max-w-none mx-6 p-6"
        />
      </div>
    </div>
  );
}

function NewNoteDialog({
  onClose,
  title,
  setTitle,
  onCreated,
}: {
  onClose: () => void;
  title: string;
  setTitle: (s: string) => void;
  onCreated: (filePath: string) => void;
}) {
  const handleCreate = async () => {
    if (!title.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();
    if (data.note) {
      onCreated(data.note.file_path);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background rounded-lg p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Create New Note</h2>
        <Input
          placeholder="Note title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoFocus
        />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
