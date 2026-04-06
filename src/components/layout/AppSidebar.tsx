"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { FileText, Tag, Settings, Search, Plus, FolderTree } from "lucide-react";
import type { TreeNode } from "@/types";

export function AppSidebar() {
  const pathname = usePathname();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["inbox"]));

  useEffect(() => {
    fetch("/api/tree")
      .then((r) => r.json())
      .then((data) => setTree(data.tree ?? []))
      .catch(console.error);
  }, []);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b">
        <Link href="/notes" className="flex items-center gap-2 font-semibold text-lg">
          <FileText className="w-5 h-5" />
          <span>Knowledge Base</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/notes"} tooltip="All Notes">
                  <Link href="/notes">
                    <FileText className="w-4 h-4" />
                    <span>All Notes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/search"} tooltip="Search">
                  <Link href="/search">
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/rules"} tooltip="Rules">
                  <Link href="/rules">
                    <Settings className="w-4 h-4" />
                    <span>Rules</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Vault</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {tree.map((node) => (
              <TreeNode key={node.path} node={node} expanded={expanded} onToggle={toggle} />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tags</SidebarGroupLabel>
          <SidebarGroupContent>
            <TagList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function TreeNode({ node, expanded, onToggle }: { node: TreeNode; expanded: Set<string>; onToggle: (path: string) => void }) {
  const isExpanded = expanded.has(node.path);

  if (node.type === "file") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href={`/notes/${node.path}`}>
              <FileText className="w-4 h-4" />
              <span className="truncate">{node.name}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => onToggle(node.path)}>
          <FolderTree className="w-4 h-4" />
          <span>{node.name}</span>
        </SidebarMenuButton>
        {isExpanded && node.children && (
          <div className="ml-4">
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} expanded={expanded} onToggle={onToggle} />
            ))}
          </div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function TagList() {
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(console.error);
  }, []);

  return (
    <div className="px-2 py-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Link
          key={tag.name}
          href={`/tags/${tag.name}`}
          className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
        >
          {tag.name} ({tag.count})
        </Link>
      ))}
      {tags.length === 0 && <span className="text-xs text-muted-foreground px-2">No tags yet</span>}
    </div>
  );
}
