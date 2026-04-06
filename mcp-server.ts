#!/usr/bin/env tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createMemory,
  readMemory,
  updateMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  getMemoryTypes,
} from "./src/lib/memory/memory";
import type { MemoryType } from "./src/lib/memory/types";

const server = new McpServer({
  name: "agentic-knowledge",
  version: "0.1.0",
});

server.tool(
  "write_memory",
  "Create or update a memory. Use this to persist information: observations about the user, project context, feedback, decisions, or reference pointers.",
  {
    type: z.enum(["user", "feedback", "project", "reference", "session"]).describe("Memory type"),
    title: z.string().optional().describe("Human-readable title, auto-slugified"),
    content: z.string().min(1).describe("Memory content (markdown)"),
    tags: z.array(z.string()).optional().describe("Tags for categorization"),
    agent: z.string().optional().describe("Agent identifier (default: 'claude')"),
    session: z.string().optional().describe("Session identifier"),
    project: z.string().optional().describe("Project name"),
    slug: z.string().optional().describe("Existing memory slug to update (mutually exclusive with create behavior)"),
    memory_type: z.string().optional().describe("Memory type for lookup when updating (used with slug)"),
  },
  async ({ type, title, content, tags, agent, session, project, slug, memory_type: memType }) => {
    try {
      if (slug && memType) {
        const updated = await updateMemory(memType, slug, { content, tags, title });
        return { content: [{ type: "text" as const, text: `Updated memory: ${memType}/${slug}` }] };
      }
      const memory = await createMemory({
        type: type as MemoryType,
        title,
        content,
        tags,
        agent: agent ?? "claude",
        session,
        project,
      });
      return { content: [{ type: "text" as const, text: `Created memory: ${memory.type}/${memory.slug}` }] };
    } catch (err: unknown) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

server.tool(
  "read_memory",
  "Read a specific memory by type and slug, or list memories of a given type.",
  {
    type: z.string().optional().describe("Memory type to list or read from"),
    slug: z.string().optional().describe("Specific memory slug (with type)"),
    tag: z.string().optional().describe("Filter memories by tag"),
    project: z.string().optional().describe("Filter memories by project"),
    limit: z.number().optional().describe("Max items (default: 50)"),
  },
  async ({ type, slug, tag, project, limit }) => {
    try {
      if (type && slug) {
        const memory = await readMemory(type, slug);
        if (!memory) {
          return { content: [{ type: "text" as const, text: `Memory not found: ${type}/${slug}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(memory, null, 2) }] };
      }
      if (type) {
        const memories = await listMemories({ type: type as MemoryType, limit });
        return { content: [{ type: "text" as const, text: JSON.stringify(memories, null, 2) }] };
      }
      const memories = await listMemories({ tag, project, limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(memories, null, 2) }] };
    } catch (err: unknown) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

server.tool(
  "search_memories",
  "Search across all memories using full-text search.",
  {
    query: z.string().min(1).describe("Search query"),
    type: z.enum(["user", "feedback", "project", "reference", "session"]).optional().describe("Filter by memory type"),
    limit: z.number().optional().describe("Max results (default: 20)"),
  },
  async ({ query, type, limit }) => {
    try {
      const results = await searchMemories(query, { type, limit });
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    } catch (err: unknown) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

server.tool(
  "delete_memory",
  "Delete a memory permanently.",
  {
    type: z.enum(["user", "feedback", "project", "reference", "session"]).describe("Memory type"),
    slug: z.string().describe("Memory slug"),
  },
  async ({ type, slug }) => {
    try {
      const success = await deleteMemory(type, slug);
      if (!success) {
        return { content: [{ type: "text" as const, text: `Memory not found: ${type}/${slug}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Deleted memory: ${type}/${slug}` }] };
    } catch (err: unknown) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

server.tool(
  "list_memory_types",
  "List available memory types with descriptions and counts.",
  {},
  async () => {
    try {
      const types = await getMemoryTypes();
      return { content: [{ type: "text" as const, text: JSON.stringify(types, null, 2) }] };
    } catch (err: unknown) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agentic Knowledge MCP server running on stdio");
}

main().catch(console.error);
