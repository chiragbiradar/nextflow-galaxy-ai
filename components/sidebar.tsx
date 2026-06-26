"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  Library,
  BookOpen,
  Settings,
  Gift,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Exact SVG from Magica for Flow icon
function FlowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 17h-8l-3.5 -5h-6.5" />
      <path d="M21 7h-8l-3.495 5" />
      <path d="M18 10l3 -3l-3 -3" />
      <path d="M18 20l3 -3l-3 -3" />
    </svg>
  );
}

// Exact SVG from Magica for Tools icon (3D box/package)
function ToolsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path d="m7 16.5-4.74-2.85" />
      <path d="m7 16.5 5-3" />
      <path d="M7 16.5v5.17" />
      <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path d="m17 16.5-5-3" />
      <path d="m17 16.5 4.74-2.85" />
      <path d="M17 16.5v5.17" />
      <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="M12 8 7.26 5.15" />
      <path d="m12 8 4.74-2.85" />
      <path d="M12 13.5V8" />
    </svg>
  );
}

const navItems = [
  { icon: MessageSquare, label: "Task", href: "/flow" },
  { icon: FolderOpen, label: "Projects", href: "/flow" },
  { icon: Library, label: "Library", href: "/flow" },
  { icon: FlowIcon, label: "Flow", href: "/flow" },
  { icon: ToolsIcon, label: "Tools", href: "/flow" },
  { icon: BookOpen, label: "API / MCP", href: "/flow" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userExpanded, setUserExpanded] = useState(true);
  const { user } = useUser();
  const fullName = user?.fullName ?? user?.firstName ?? "Account";

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-[#e0e0e2] bg-[#f0f0f0] transition-all duration-200 shrink-0",
        collapsed ? "w-[52px]" : "w-[296px]"
      )}
    >
      {/* Logo row */}
      <div className="group/logo flex items-center justify-between px-2 py-3">
        {!collapsed ? (
          <Link href="/flow" className="flex items-center px-1">
            <img src="/magica-logo.webp" alt="Magica" className="h-[26px] w-[104px] object-contain" />
          </Link>
        ) : (
          <Link href="/flow" className="w-9 h-9 flex items-center justify-center">
            <img src="/magica-icon.png" alt="Magica" className="w-5 h-5" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
            <path d="m14 9 3 3-3 3"/>
          </svg>
        </button>
      </div>

      {/* Top actions */}
      <div className="px-2 pt-1 space-y-0.5">
        <button className={cn(
          "group w-full flex items-center gap-[9px] px-2 py-2 rounded-lg text-sm text-[#3d3d41] hover:bg-black/5 transition-colors",
          collapsed && "justify-center w-9 h-9 px-0"
        )}>
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">New task</span>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">⌃⇧O</span>
            </>
          )}
        </button>
        <button className={cn(
          "group w-full flex items-center gap-[9px] px-2 py-2 rounded-lg text-sm text-[#3d3d41] hover:bg-black/5 transition-colors",
          collapsed && "justify-center w-9 h-9 px-0"
        )}>
          <Search className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search Task</span>
              <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">⌃K</span>
            </>
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 pt-1 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = label === "Flow" && pathname.startsWith("/flow");
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-[9px] px-2 py-2 rounded-lg text-sm transition-colors",
                collapsed && "justify-center w-9 h-9 px-0",
                isActive
                  ? "bg-[#dadada] text-[#3d3d41] font-medium"
                  : "text-[#3d3d41] hover:bg-black/5"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* No tasks yet */}
      {!collapsed ? (
        <div className="flex-1 flex items-center justify-center px-3 overflow-y-auto">
          <p className="text-sm text-gray-400 text-center">No tasks yet</p>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom */}
      <div className="px-2 pb-3 border-t border-[#e0e0e2] pt-2">
        {!collapsed && (
          <>
            {userExpanded && (
              <div className="space-y-2 mb-1">
                <button className="w-full flex items-center justify-center gap-2 px-3 h-9 rounded-full text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Settings</span>
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Claim Offer</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setUserExpanded(v => !v)}
              className="w-full flex items-center justify-center py-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", userExpanded && "rotate-180")} />
            </button>
            <div className="flex items-center justify-center gap-2.5 px-1 py-1">
              <UserButton />
              <span className="text-sm text-gray-700 truncate">{fullName}</span>
            </div>
          </>
        )}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 py-1">
            <button className="p-1.5 rounded-full text-gray-500 hover:bg-white border border-gray-200">
              <Settings className="w-3.5 h-3.5" />
            </button>
            <UserButton />
          </div>
        )}
      </div>
    </aside>
  );
}
