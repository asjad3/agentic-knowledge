# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal knowledge base app ("Agentic Knowledge Base") built with **Next.js 16 (App Router)**. Notes are stored as plain `.md` files on disk in a PARA-organized vault, with a SQLite (`@libsql/client`) index for metadata, tags, and full-text search. Designed to eventually support MCP access and data sync from external sources.

## Commands

```bash
npm run dev      # Start dev server (Next.js dev)
npm run build    # Production build
npm run start    # Start production server
```

Database is auto-initialized from `node_modules/next/dist/docs/` — there is no separate migration system. The SQLite schema (tables: `notes`, `tags`, `note_tags`, `rules`, `sync_log`, `notes_fts`) is defined in `src/lib/db/schema.ts` and applied on first DB connection.

## Architecture

### Dual Storage: Filesystem + SQLite

- **Source of truth**: Plain `.md` files in `kb-vault/` (PARA structure: `inbox/`, `projects/`, `areas/`, `resources/`, `archive/`). Ignited by `.env.local` → `KB_VAULT_PATH`.
- **Index**: SQLite for querying — metadata, tags, and an FTS5 full-text search index (`notes_fts`).
- Every file write triggers a DB upsert (notes table + note_tags junction + FTS index). Deleting a note removes both the file and all DB rows.

### Directory Structure

```
src/
  app/               # Next.js App Router
    api/notes/[...slugs]/route.ts  # GET, PUT, PATCH, DELETE a note
    api/notes/route.ts             # GET list, POST create
    api/search/route.ts            # FTS5 search
    api/tags/route.ts              # All tags with counts
    api/tree/route.ts              # File tree for sidebar
    api/rules/route.ts             # Rules CRUD (GET, POST, PUT, DELETE)
    notes/[[...slugs]]/page.tsx    # Note list + MDXEditor-based note viewer
    rules/page.tsx                 # Rules management UI
    search/page.tsx                # Search results page
    tags/[tag]/page.tsx            # Tag-filtered note list
  components/
    layout/AppSidebar.tsx          # Collapsible sidebar with tree + tags
    Providers.tsx                  # Tooltip + Sidebar providers
    ui/                            # shadcn/ui components (base-ui style)
  lib/
    db/index.ts          # @libsql client singleton + dbRun/dbGet/dbAll helpers
    db/schema.ts         # SQL schema (CREATE TABLE, FTS5, triggers)
    fs/vault.ts          # Vault path resolution, PARA folder creation
    fs/notes.ts          # Note CRUD: read/write/create/delete .md with frontmatter (gray-matter)
    fs/tree.ts           # Recursive directory walker → TreeNode[]
    rules/engine.ts      # Rule evaluation: condition matching + actions (move/tag/categorize)
    rules/db.ts          # Rules SQL CRUD
  store/
    ui.ts                # Zustand: sidebar toggle
    kb.ts                # Zustand: active note, dirty state, save status
  types/index.ts         # Note, NoteWithContent, TreeNode, TagInfo, Rule, SearchResult
```

### Key Patterns

- **Note paths**: URL slugs map directly to relative file paths inside `kb-vault/`. E.g., `/notes/inbox/my-note` resolves to `kb-vault/inbox/my-note.md`.
- **Frontmatter**: YAML frontmatter (`title`, `tags`, `category`, `source`, `created`, `modified`, `pinned`) is parsed by `gray-matter` on read and serialized on write.
- **Rules engine**: Triggered on note PATCH when tags or category change. Rules are evaluated in priority order (highest first), sorted by `enabled` flag. Actions: move (physical `fs.renameSync`), tag (rewrite frontmatter), categorize (rewrite frontmatter).
- **shadcn/ui**: Uses base-ui style (`@base-ui/react`), not Radix. Components added: button, input, textarea, dialog, dropdown-menu, tooltip, badge, separator, scroll-area, alert-dialog, command, sheet, skeleton.
- **MDXEditor**: `@mdxeditor/editor` with plugins for headings, lists, quotes, code blocks, tables, links, images, frontmatter, and toolbar.
- **No test framework** is currently configured.

### Environment Variables

- `KB_VAULT_PATH` — path to the vault directory (default: `./kb-vault`)
- `KB_DB_PATH` — path to the SQLite database file (default: `./kb-vault/.index.db`)

### Important Notes for Future Instances

- All note modifications go through the filesystem; the SQLite index is a secondary projection.
- The rules engine modifies files on disk (move via `fs.renameSync`) which also updates the DB index.
- FTS5 table uses `porter unicode61` tokenization.
- Hidden directories (`.next/`, dotfiles) are excluded from the file tree.
