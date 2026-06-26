"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Type, Image, Cpu, Flag, ChevronRight } from "lucide-react";
import React from "react";

interface NodeDef {
  type: string;
  label: string;
  category: "OTHERS" | "IMAGE";
  icon: React.ReactNode;
}

const NODE_DEFS: NodeDef[] = [
  { type: "requestInputs", label: "Request Inputs", category: "OTHERS", icon: <Type className="w-4 h-4 text-orange-500" /> },
  { type: "gemini", label: "LLM Call", category: "OTHERS", icon: <Cpu className="w-4 h-4 text-blue-500" /> },
  { type: "response", label: "Response", category: "OTHERS", icon: <Flag className="w-4 h-4 text-gray-600" /> },
  { type: "cropImage", label: "Crop Image", category: "IMAGE", icon: <Image className="w-4 h-4 text-purple-500" /> },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string) => void;
}

export function AddNodeModal({ open, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const categories = ["OTHERS", "IMAGE"] as const;
  const filtered = NODE_DEFS.filter(n =>
    n.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-60 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="flex-1 text-xs text-gray-700 bg-transparent outline-none placeholder-gray-400"
        />
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {categories.map(cat => {
          const nodes = filtered.filter(n => n.category === cat);
          if (!nodes.length) return null;
          return (
            <div key={cat}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {cat}
              </p>
              {nodes.map(node => (
                <button
                  key={node.type}
                  onClick={() => { onAdd(node.type); onClose(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 bg-gray-50">
                    {node.icon}
                  </div>
                  <span className="flex-1 text-sm text-gray-700">{node.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-gray-400">
            No nodes match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}
