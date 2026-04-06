export type MemoryType = "user" | "feedback" | "project" | "reference" | "session";

export interface Memory {
  slug: string;
  type: MemoryType;
  title: string;
  content: string;
  tags: string[];
  agent: string;
  session?: string;
  project?: string;
  created_at: string;
  modified_at: string;
  frontmatter: Record<string, unknown>;
}

export interface CreateMemoryInput {
  type: MemoryType;
  title?: string;
  content: string;
  tags?: string[];
  agent?: string;
  session?: string;
  project?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  tags?: string[];
  title?: string;
  project?: string;
  metadata?: Record<string, unknown>;
}

export interface ListMemoryFilters {
  type?: MemoryType;
  tag?: string;
  project?: string;
  agent?: string;
  limit?: number;
  offset?: number;
}

export interface MemoryTypeInfo {
  name: MemoryType;
  description: string;
  count: number;
}
