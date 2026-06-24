"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  BookOpen,
  GitBranch,
  Wrench,
  Code2,
  Settings,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { icon: MessageSquare, label: "Task", href: "/flow" },
  { icon: FolderOpen, label: "Projects", href: "/flow" },
  { icon: BookOpen, label: "Library", href: "/flow" },
  { icon: GitBranch, label: "Flow", href: "/flow" },
  { icon: Wrench, label: "Tools", href: "/flow" },
  { icon: Code2, label: "API / MCP", href: "/flow" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-gray-200 bg-white transition-all duration-200 shrink-0",
        collapsed ? "w-[56px]" : "w-[260px]"
      )}
    >
      {/* Logo row */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        {!collapsed && (
          <Link href="/flow" className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">NextFlow</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto"
        >
          <PanelLeftClose className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Top actions */}
      <div className="px-2 pt-2 space-y-0.5">
        <button className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors",
          collapsed && "justify-center"
        )}>
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New task</span>}
        </button>
        <button className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors",
          collapsed && "justify-center"
        )}>
          <Search className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Search Task</span>}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 pt-1 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = label === "Flow" && pathname.startsWith("/flow");
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-gray-100 pt-2">
        <button className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors",
          collapsed && "justify-center"
        )}>
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <div className={cn("flex items-center gap-2.5 px-2.5 py-2", collapsed && "justify-center")}>
          <UserButton />
          {!collapsed && <span className="text-sm text-gray-700">Account</span>}
        </div>
      </div>
    </aside>
  );
}
