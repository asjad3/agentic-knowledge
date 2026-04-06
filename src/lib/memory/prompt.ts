export const MEMORY_USAGE_PROMPT = `## Memory System

You have access to a persistent memory system. You SHOULD use it to remember important information across sessions.

### Memory Types

1. **user** — Information about the user: their role, preferences, working style, skills, knowledge gaps, communication preferences.
   - When to write: When you learn something new about the user's role, expertise, or preferences.
   - Example: "User is a data scientist investigating logging patterns"

2. **feedback** — How the user wants you to behave: corrections, preferences, confirmed approaches.
   - When to write: When the user corrects your approach ("don't do X", "do Y instead") OR confirms a non-obvious approach worked.
   - Format: Lead with the rule, then **Why:** line (reason), then **How to apply:** line.
   - Example: "Integration tests must hit a real database, not mocks. Reason: prior prod migration incident."

3. **project** — Ongoing work, goals, bugs, decisions, stakeholders.
   - When to write: New initiative starts, major decisions are made, bugs discovered, deadlines set.
   - Convert relative dates to absolute dates (e.g., "by Friday" → "2026-03-05").
   - Project memories decay fast — focus on what matters for future context.

4. **reference** — Pointers to external systems: Linear projects, Slack channels, Grafana dashboards, wiki pages.
   - When to write: User mentions an external resource you may need to access later.
   - Example: "Pipeline bugs tracked in Linear project INGEST"

5. **session** — Conversation summaries, task context, what was attempted in this session.
   - When to write: At end of a significant session, or when context switching.
   - Keep concise — this info helps future-you pick up where you left off.

### When NOT to Save

- Code patterns, conventions, architecture, file paths — derive by reading the codebase.
- Git history, recent changes, who-changed-what — use \`git log\` / \`git blame\`.
- Debugging solutions — the fix is in the code; the commit has context.
- Anything already documented in CLAUDE.md files.

### Retrieval Workflow

Before starting a task, use \`read_memory\` to check:
- **user** type for user context (role, preferences, expertise)
- **project** type for ongoing work and goals
- **feedback** type for established work patterns

Use \`search_memories\` when looking for context relevant to the current task.

**IMPORTANT**: Memory is context. If a memory says something that conflicts with the current state of the code, trust what you observe now and update or remove the stale memory.

### MCP Tools Available

- \`write_memory(type, content, title?, tags?, slug?, memory_type?)\` — Create or update a memory
- \`read_memory(type?, slug?, tag?, project?, limit?)\` — Read a specific memory or list by type
- \`search_memories(query, type?, limit?)\` — Full-text search across memories
- \`delete_memory(type, slug)\` — Remove a memory
- \`list_memory_types()\` — Available types with descriptions

### REST API Available

- \`POST /api/memories { type, content, title?, tags?, agent?, session?, project? }\` — Create
- \`GET /api/memories?type=&tag=&limit=\` — List with filters
- \`GET /api/memories/<type>/<slug>\` — Read single memory
- \`PUT /api/memories/<type>/<slug> { content?, tags?, title?, metadata? }\` — Update
- \`DELETE /api/memories/<type>/<slug>\` — Delete
- \`GET /api/memories/search?q=&type=\` — Search
- \`GET /api/memories/types\` — Available types`;
