# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal knowledge base app ("Agentic Knowledge Base") built with **Next.js 16 (App Router)**. Notes are stored as plain `.md` files on disk in a PARA-organized vault, with a SQLite (`@libsql/client`) index for metadata, tags, and full-text search. Designed to eventually support MCP access and data sync from external sources.

## Commands

```bash
npm run dev      # Start dev server (Next.js dev)
npm run build    # Production build
npm run start    # Start production server
npm run mcp      # Run MCP server via stdio (tsx mcp-server.ts)
```

Database schema is defined in `src/lib/db/schema.ts` and applied on first `getDb()` call. A runtime migration in `db/index.ts` adds the `memory_type` column to `notes`. Standalone init script: `scripts/init-db.ts`. No separate migration system or test framework is configured.

See `AGENTS.md` for Next.js 16 breaking-change warnings — consult `node_modules/next/dist/docs/` before writing Next.js-specific code.

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
    api/notes/route.ts             # GET list (paginated), POST create
    api/search/route.ts            # FTS5 search
    api/tags/route.ts              # All tags with counts
    api/tree/route.ts              # File tree for sidebar
    api/rules/route.ts             # Rules CRUD (GET, POST, PUT, DELETE)
    api/memories/route.ts          # GET list (filtered), POST create
    api/memories/[...slugs]/route.ts  # GET, PUT, PATCH, DELETE a memory
    api/memories/search/route.ts   # FTS search within memories
    api/memories/types/route.ts    # GET memory type definitions
    notes/[[...slugs]]/page.tsx    # Note list + MDXEditor-based note viewer
    rules/page.tsx                 # Rules management UI
    search/page.tsx                # Search results page
    tags/[tag]/page.tsx            # Tag-filtered note list
  components/
    layout/AppSidebar.tsx          # Collapsible sidebar with nav links, vault tree, tags
    Providers.tsx                  # Tooltip + Sidebar providers
    ui/                            # shadcn/ui components (base-ui style)
  lib/
    db/index.ts          # @libsql client singleton + dbRun/dbGet/dbAll helpers + migration
    db/schema.ts         # SQL schema (CREATE TABLE, FTS5, triggers)
    fs/vault.ts          # Vault path resolution, PARA folder creation
    fs/notes.ts          # Note CRUD: read/write/create/delete .md with frontmatter (gray-matter) + DB upsert
    fs/tree.ts           # Recursive directory walker → TreeNode[]
    memory/memory.ts     # Memory CRUD (wraps notes with memory_type metadata)
    memory/types.ts      # Memory, MemoryType interfaces
    memory/prompt.ts     # Agent prompt template for memory system usage
    rules/engine.ts      # Rule evaluation: condition matching + actions (move/tag/categorize)
    rules/db.ts          # Rules SQL CRUD
  store/
    ui.ts                # Zustand: sidebar toggle
    kb.ts                # Zustand: active note, dirty state, save status (infrastructure, not actively used by pages)
  types/index.ts         # Note, NoteWithContent, TreeNode, TagInfo, Rule, RuleCondition, RuleAction, RuleResult, SearchResult
```

### Memory System

Memories are notes stored in `kb-vault/memories/{type}/` with a `memory_type` frontmatter field. Five types: `user`, `feedback`, `project`, `reference`, `session`. The `lib/memory/` module wraps existing `writeNote`/`readNote`/`deleteNote` functions, adding memory-specific fields (`agent`, `session`, `project`) and filtered listing/searching. The MCP server exposes memories as tools for external agents.

### Key Patterns

- **Note paths**: URL slugs map directly to relative file paths inside `kb-vault/`. E.g., `/notes/inbox/my-note` resolves to `kb-vault/inbox/my-note.md`.
- **Frontmatter**: YAML frontmatter (`title`, `tags`, `category`, `source`, `created`, `modified`, `pinned`, `memory_type`) is parsed by `gray-matter` on read and serialized on write.
- **Rules engine**: Triggered on note PATCH when tags or category change. Rules are evaluated in priority order (highest first), filtered by `enabled` flag. Actions: move (physical `fs.renameSync`), tag (rewrite frontmatter), categorize (rewrite frontmatter). Rules cascade — each rule re-reads the note state after the previous action.
- **shadcn/ui**: Uses base-ui style (`@base-ui/react`), not Radix. Components added: button, input, textarea, dialog, dropdown-menu, tooltip, badge, separator, scroll-area, alert-dialog, command, sheet, skeleton.
- **MDXEditor**: `@mdxeditor/editor` with plugins for headings, lists, quotes, code blocks, tables, links, images, frontmatter, and toolbar.
- **MCP server** (`mcp-server.ts`): Exposes five tools over stdio — `write_memory`, `read_memory`, `search_memories`, `delete_memory`, `list_memory_types`. Allows MCP-compatible agents to read/write the knowledge base programmatically.

### Data Flow

**Write path**: User saves → `PUT /api/notes/[...slugs]` → `writeNote()` writes `.md` file (primary) → `upsertNoteToDb()` updates `notes` + `note_tags` + `notes_fts` (secondary index).

**Read path**: `GET /api/notes` queries `notes` table. `GET /api/notes/[...slugs]` reads from filesystem via `gray-matter`. `GET /api/search` queries `notes_fts` FTS5.

### Environment Variables

- `KB_VAULT_PATH` — path to the vault directory (default: `./kb-vault`)
- `KB_DB_PATH` — path to the SQLite database file (default: `./kb-vault/.index.db`)

### MCP Server Configuration

The `.mcp.json` at the project root registers this server with Claude Code automatically. No manual config needed — Claude Code picks it up on startup.

The server exposes five tools: `write_memory`, `read_memory`, `search_memories`, `delete_memory`, `list_memory_types`. It communicates over stdio and requires the vault and DB to be initialized (run `npm run dev` at least once first to create `kb-vault/` and `.index.db`).

### Important Notes for Future Instances

- All note modifications go through the filesystem; the SQLite index is a secondary projection.
- The rules engine modifies files on disk (move via `fs.renameSync`) which also updates the DB index.
- FTS5 table uses `porter unicode61` tokenization.
- Hidden directories (`.next/`, dotfiles) are excluded from the file tree.
- The `kb.ts` Zustand store is prepared infrastructure — note pages currently use local React `useState` rather than the store.
- `/tags/[tag]` is inefficient: it fetches all notes then checks tags client-side instead of querying the `note_tags` junction table.
- No authentication or multi-tenancy — single-user, local-first design.
