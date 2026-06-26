"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronRight, Clock, Image, Video, Mic } from "lucide-react";
import React from "react";

interface NodeDef {
  type: string;
  label: string;
  category: "RECENT_ITEM" | "IMAGE" | "VIDEO" | "AUDIO" | "OTHERS";
  comingSoon?: boolean;
}

const NODE_DEFS: NodeDef[] = [
  { type: "imageGen",      label: "Generate Image",   category: "IMAGE" },
  { type: "cropImage",     label: "Edit Image",        category: "IMAGE" },
  { type: "__video",       label: "Generate Video",    category: "VIDEO",  comingSoon: true },
  { type: "__audio",       label: "Text to Speech",    category: "AUDIO",  comingSoon: true },
  { type: "requestInputs", label: "Text Input",        category: "OTHERS" },
  { type: "gemini",        label: "LLM Call",          category: "OTHERS" },
  { type: "stickyNote",    label: "Sticky Note",       category: "OTHERS" },
];

const CATEGORIES: { id: NodeDef["category"]; label: string; icon: React.ReactNode }[] = [
  { id: "IMAGE",  label: "IMAGE",  icon: <Image className="w-3 h-3" /> },
  { id: "VIDEO",  label: "VIDEO",  icon: <Video className="w-3 h-3" /> },
  { id: "AUDIO",  label: "AUDIO",  icon: <Mic   className="w-3 h-3" /> },
  { id: "OTHERS", label: "OTHERS", icon: null },
];

const RECENT_KEY = "nf_recent_nodes";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function pushRecent(type: string) {
  const recent = getRecent().filter(t => t !== type);
  localStorage.setItem(RECENT_KEY, JSON.stringify([type, ...recent].slice(0, 3)));
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function AddNodeModal({ open, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleAdd(type: string) {
    pushRecent(type);
    onAdd(type);
    onClose();
  }

  const realDefs = NODE_DEFS.filter(n => !n.comingSoon);
  const searchLower = search.toLowerCase();
  const filtered = search
    ? realDefs.filter(n => n.label.toLowerCase().includes(searchLower))
    : null;

  const recentDefs = recent
    .map(t => NODE_DEFS.find(n => n.type === t))
    .filter((n): n is NodeDef => !!n && !n.comingSoon);

  return (
    <div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search nodes or models..."
          className="flex-1 text-[13px] text-gray-700 bg-transparent outline-none placeholder-gray-400"
        />
        {search ? (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto py-1">
        {filtered ? (
          <>
            {filtered.map(node => <NodeRow key={node.type} node={node} onAdd={handleAdd} />)}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">
                No nodes match &ldquo;{search}&rdquo;
              </p>
            )}
          </>
        ) : (
          <>
            {/* Recent */}
            {recentDefs.length > 0 && (
              <div>
                <CategoryLabel label="Recent" icon={<Clock className="w-3 h-3" />} />
                {recentDefs.map(n => <NodeRow key={n.type} node={n} onAdd={handleAdd} />)}
              </div>
            )}
            {/* Categories */}
            {CATEGORIES.map(cat => {
              const nodes = NODE_DEFS.filter(n => n.category === cat.id);
              if (!nodes.length) return null;
              return (
                <div key={cat.id}>
                  <CategoryLabel label={cat.label} icon={cat.icon} />
                  {nodes.map(n => <NodeRow key={n.type} node={n} onAdd={handleAdd} />)}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function CategoryLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1 text-gray-400">
      {icon}
      <span className="text-[11px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}

function NodeRow({ node, onAdd }: { node: NodeDef; onAdd: (type: string) => void }) {
  if (node.comingSoon) {
    return (
      <div className="flex items-center justify-between px-3 py-2 opacity-40 cursor-not-allowed select-none">
        <span className="text-[13px] text-gray-600">{node.label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      </div>
    );
  }
  return (
    <button
      onClick={() => onAdd(node.type)}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
    >
      <span className="text-[13px] text-gray-700">{node.label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
    </button>
  );
}
