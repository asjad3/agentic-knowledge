# Agentic Knowledge Base — V1 Plan

## Context
Building a personal knowledge base from scratch as a Next.js app. Plain markdown files on disk (observable, file-based), rich markdown editor with live preview, SQLite for metadata/indexing, PARA folder structure, and organizational rules. All designed to eventually support MCP access and data sync from iMessage/Email/Twitter/Claude messages.

**Stack:** Next.js (App Router) + TailwindCSS v4 + TypeScript + @libsql/client + MDXEditor + Zustand + shadcn/ui

---

## Step 1: Project Scaffolding
- `npx create-next-app@latest` with TypeScript, Tailwind, App Router, src/
- Install deps: `@mdxeditor/editor`, `@libsql/client`, `zustand`, `gray-matter`, `lucide-react`, `framer-motion`, `date-fns`, `clsx`, `tailwind-merge`, `class-variance-authority`
- Init shadcn/ui, add: button, input, dialog, dropdown-menu, tooltip, badge, separator, scroll-area, textarea, alert-dialog, command
- Create `.env.local` → `KB_VAULT_PATH=./kb-vault`, `KB_DB_PATH=./kb-vault/.index.db`
- Add `kb-vault/` to `.gitignore`

## Step 2: Vault + SQLite Init
- Create default vault structure: `kb-vault/{inbox,projects,areas,resources,archive}/` with a `.gitkeep` in each
- `src/lib/db.ts` — @libsql client singleton with WAL mode
- `src/lib/db/schema.ts` — CREATE TABLE: notes, tags, note_tags, rules, sync_log; notes_fts FTS5 virtual table + sync triggers
- `scripts/init-db.ts` — standalone tsx script that runs schema SQL

## Step 3: File System Layer
- `src/lib/fs/vault.ts` — resolve vault path, validate/create structure
- `src/lib/fs/notes.ts` — CRUD: read/write/create/delete `.md` files, with frontmatter extraction
- `src/lib/fs/tree.ts` — recursive directory walker → `TreeNode[]`
- `src/lib/frontmatter.ts` — gray-matter wrapper: parse/serialize YAML frontmatter
- All file writes trigger a DB upsert (notes table + note_tags + FTS index)

## Step 4: API Routes Foundation
- `/api/tree` GET — folder/file tree for sidebar
- `/api/notes` GET — list notes from SQLite with pagination/sort/filter
- `/api/notes` POST — create note in `inbox/`, auto-generate slug, write file, upsert DB
- `/api/notes/[...slugs]` GET — read specific note (file content + metadata)
- `/api/notes/[...slugs]` PUT/PATCH — save/update note, trigger rules engine
- `/api/notes/[...slugs]` DELETE — delete note file + remove DB row

## Step 5: App Shell + Navigation
- `src/app/layout.tsx` — root layout with Providers wrapper
- `src/components/layout/AppShell.tsx` — sidebar + content area shell
- `src/components/layout/Sidebar.tsx` — tree view calls `/api/tree`, expandable folders
- `src/components/layout/TreeItem.tsx` — recursive folder/file rendering
- `src/components/layout/Breadcrumbs.tsx` — current note path
- `src/store/ui.ts` — sidebar toggle state, theme, active view
- `src/app/notes/[[...slugs]]/page.tsx` — main note viewer/editor route
- `src/app/notes/page.tsx` — note list index page

## Step 6: Markdown Editor
- `src/components/editor/MDXEditor.tsx` — wraps `@mdxeditor/editor` with plugins: headings, lists, quotes, code blocks, tables, toolbar, frontmatter
- `src/components/editor/EditorToolbar.tsx` — save button, tag picker, category selector
- `src/store/kb.ts` — active note content, dirty state, save status
- Auto-save with 1.5s debounce, Ctrl+S manual save shortcut
- Frontmatter visible in editor as YAML block at top

## Step 7: Tag Views + Note Listing
- `src/components/notes/NoteList.tsx` — grid/list card layout
- `src/components/notes/NoteListCard.tsx` — title, preview snippet, tag pills, modified date
- `src/components/notes/NoteMetaBadges.tsx` — tag pills, category label, source badge
- `src/app/tags/[tag]/page.tsx` — notes filtered by tag
- `/api/tags` GET — all tags with usage counts

## Step 8: Search
- `/api/search` GET — FTS5 MATCH query against title + content
- `src/app/search/page.tsx` — results page with highlighted snippets
- `src/components/search/SearchInput.tsx` — command-palette search, Ctrl+K trigger
- Results show title, content preview with match highlight, tags

## Step 9: Rules System
- `src/lib/rules/types.ts` — Rule, RuleCondition, RuleAction, RuleResult types
- `src/lib/rules/engine.ts` — evaluate rules against note metadata, apply actions (move, tag, categorize)
- `/api/rules` GET/POST/PUT/DELETE — CRUD for rules
- `src/app/rules/page.tsx` — rules management UI
- `src/components/rules/RulesList.tsx` — list with enable/disable toggles
- `src/components/rules/RuleForm.tsx` — create/edit rule form
- "Run rules on all notes" endpoint

## Step 10: MCP Stub + Polish
- `src/lib/kb/service.ts` — `KbService` interface (enables future MCP reuse)
- `src/lib/sync/index.ts` — `SyncAdapter` interface stub for future adapters
- Global keyboard shortcuts: Ctrl+S save, Ctrl+N new note, Ctrl+K search, Ctrl+B sidebar
- Loading/error/empty states
- Dark mode toggle
- README with dev instructions

---

## Verification

1. `npm run dev` — dev server starts, vault auto-created
2. Create a note in inbox → verify `.md` file appears in `kb-vault/inbox/`
3. Edit note → verify file updates in real time
4. Add tags → verify they appear in `/api/tags` and tag filter works
5. Search for content → verify FTS results returned
6. Create a rule (e.g., "tagged X → move to projects/") → run it → verify file moved
7. Verify files are plain `.md`, gitignored but observable on disk
