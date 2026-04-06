import fs from "fs";
import path from "path";
import { ensureVault } from "./vault";
import type { TreeNode } from "@/types";

export function getTree(): TreeNode[] {
  const vaultPath = ensureVault();
  return buildTree(vaultPath, vaultPath);
}

function buildTree(dir: string, root: string): TreeNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // skip hidden files/dirs

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(root, fullPath);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "folder",
        children: buildTree(fullPath, root),
      });
    } else if (entry.name.endsWith(".md")) {
      nodes.push({
        name: entry.name.replace(/\.md$/, ""),
        path: relPath,
        type: "file",
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
