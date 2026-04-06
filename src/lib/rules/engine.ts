import fs from "fs";
import path from "path";
import type { NoteWithContent, Rule, RuleCondition, RuleAction, RuleResult } from "@/types";
import { ensureVault, resolveNotePath } from "@/lib/fs/vault";
import { writeNote, readNote, deleteNote } from "@/lib/fs/notes";

export async function evaluateRules(note: NoteWithContent, rules: Rule[]): Promise<RuleResult[]> {
  const sorted = rules.filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);
  const results: RuleResult[] = [];
  let currentNote = { ...note };

  for (const rule of sorted) {
    if (!testCondition(currentNote, rule.condition)) {
      results.push({ ruleId: rule.id, fired: false });
      continue;
    }

    try {
      const actionResult = await executeAction(rule.action, currentNote);
      results.push({ ruleId: rule.id, fired: true, actionTaken: actionResult });
      const updated = await readNote(currentNote.file_path.split(path.sep));
      if (updated) Object.assign(currentNote, updated);
    } catch (e: unknown) {
      results.push({ ruleId: rule.id, fired: false, error: String(e) });
    }
  }

  return results;
}

export function testCondition(note: NoteWithContent, condition: RuleCondition): boolean {
  const { field, operator, value } = condition;

  switch (field) {
    case "title": {
      const title = note.title.toLowerCase();
      const v = String(value).toLowerCase();
      return opMatch(title, operator, v);
    }
    case "tags": {
      const tags = note.tags.map((t) => t.toLowerCase());
      if (operator === "has_tag") return tags.includes(String(value).toLowerCase());
      if (operator === "has_any_tag") {
        const v = Array.isArray(value) ? value.map(String) : [String(value)];
        return v.some((tag) => tags.includes(tag.toLowerCase()));
      }
      return opMatch(tags.join(","), operator, String(value));
    }
    case "category":
      return opMatch(note.category.toLowerCase(), operator, String(value).toLowerCase());
    case "source":
      return opMatch(note.source.toLowerCase(), operator, String(value).toLowerCase());
    case "content":
      return opMatch(note.content.toLowerCase(), operator, String(value).toLowerCase());
    case "path":
      return opMatch(note.file_path.toLowerCase(), operator, String(value).toLowerCase());
    default:
      return false;
  }
}

function opMatch(actual: string, operator: string, value: string): boolean {
  switch (operator) {
    case "contains": return actual.includes(value);
    case "equals": return actual === value;
    case "starts_with": return actual.startsWith(value);
    case "matches":
      try { return new RegExp(value, "i").test(actual); } catch { return false; }
    case "always": return true;
    default: return false;
  }
}

async function executeAction(action: RuleAction, note: NoteWithContent): Promise<string> {
  const vaultPath = ensureVault();

  switch (action.type) {
    case "move": {
      const fileName = path.basename(note.file_path);
      const newRelPath = path.join(action.target, fileName);
      const oldPath = path.join(vaultPath, note.file_path);
      const newPath = path.join(vaultPath, newRelPath);

      if (oldPath !== newPath && fs.existsSync(oldPath)) {
        fs.mkdirSync(path.dirname(newPath), { recursive: true });
        fs.renameSync(oldPath, newPath);
        await deleteNote(note.file_path.split(path.sep));
      }
      return `Moved to ${newRelPath}`;
    }
    case "tag": {
      if (!note.tags.includes(action.target)) {
        const fm = { ...note.frontmatter, tags: [...note.tags, action.target] };
        await writeNote(note.file_path.split(path.sep), note.content, fm);
      }
      return `Added tag: ${action.target}`;
    }
    case "categorize": {
      if (note.category !== action.target) {
        const fm = { ...note.frontmatter, category: action.target };
        await writeNote(note.file_path.split(path.sep), note.content, fm);
      }
      return `Categorized as: ${action.target}`;
    }
    default:
      throw new Error(`Unknown action type: ${(action as RuleAction).type}`);
  }
}
