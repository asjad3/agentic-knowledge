export interface Note {
  id: number;
  file_path: string;
  title: string;
  slug: string;
  created_at: string;
  modified_at: string;
  content_preview: string;
  word_count: number;
  category: string;
  source: string;
  source_url: string;
  pinned: boolean;
}

export interface NoteWithContent extends Note {
  content: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface Rule {
  id: number;
  name: string;
  description: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
  priority: number;
  created_at: string;
}

export interface RuleCondition {
  field: "title" | "tags" | "category" | "source" | "content" | "path";
  operator: "contains" | "equals" | "starts_with" | "matches" | "has_tag" | "has_any_tag" | "always";
  value: string | string[];
}

export interface RuleAction {
  type: "move" | "tag" | "categorize";
  target: string;
}

export interface RuleResult {
  ruleId: number;
  fired: boolean;
  actionTaken?: string;
  error?: string;
}

export interface SearchResult {
  id: number;
  file_path: string;
  title: string;
  preview: string;
  tags: string[];
  modified_at: string;
}
