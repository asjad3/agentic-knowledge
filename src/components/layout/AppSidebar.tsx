"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { FileText, Tag as TagIcon, Settings, Search, FolderTree, ChevronRight, ChevronDown } from "lucide-react";
import type { TreeNode } from "@/types";

export function AppSidebar() {
  const pathname = usePathname();
  const [tree, setTree] = useState<TreeNode[]>([]);

  useEffect(() => {
    fetch("/api/tree")
      .then((r) => r.json())
      .then((data) => setTree(data.tree ?? []))
      .catch(console.error);
  }, [pathname]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-3 border-b">
        <Link href="/notes" className="flex items-center gap-2 font-semibold text-lg no-underline">
          <FileText className="w-5 h-5" />
          <span>Knowledge Base</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavLinks pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Vault</SidebarGroupLabel>
          <SidebarGroupContent>
            {tree.map((node) => (
              <TreeNodeView key={node.path} node={node} />
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

function NavLinks({ pathname }: { pathname: string }) {
  const links = [
    { href: "/notes", label: "All Notes", icon: FileText, active: pathname === "/notes" || pathname.startsWith("/notes/") },
    { href: "/search", label: "Search", icon: Search, active: pathname === "/search" },
    { href: "/rules", label: "Rules", icon: Settings, active: pathname === "/rules" },
  ];

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors no-underline ${
            link.active
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "hover:bg-sidebar-accent/50"
          }`}
        >
          <link.icon className="w-4 h-4" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function TreeNodeView({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();

  if (node.type === "file") {
    const isActive = pathname === `/notes/${node.path}`;
    return (
      <Link
        href={`/notes/${node.path}`}
        className={`flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md transition-colors no-underline mx-1 ${
          isActive ? "bg-sidebar-accent font-medium" : "hover:bg-sidebar-accent/50"
        }`}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="truncate">{node.name}</span>
      </Link>
    );
  }

  return (
    <div className="mx-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 w-full px-1 py-1.5 text-sm hover:bg-sidebar-accent/50 rounded-md transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <FolderTree className="w-4 h-4" />
        <span>{node.name}</span>
      </button>
      {expanded && node.children && node.children.length > 0 && (
        <div className="ml-3 border-l pl-2">
          {node.children.map((child) => (
            <TreeNodeView key={child.path} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function TagList() {
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);

  const loadTags = useCallback(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  return (
    <div className="px-2 py-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Link
          key={tag.name}
          href={`/tags/${tag.name}`}
          className="flex items-center gap-1 text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors no-underline"
        >
          <TagIcon className="w-3 h-3" />
          <span>{tag.name}</span>
          <span className="opacity-60">({tag.count})</span>
        </Link>
      ))}
      {tags.length === 0 && <span className="text-xs text-muted-foreground px-2">No tags yet</span>}
    </div>
  );
}
