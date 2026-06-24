"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Type, Image, Cpu, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeDef {
  type: string;
  label: string;
  description: string;
  category: "OTHERS" | "IMAGE";
  icon: React.ReactNode;
}

const NODE_DEFS: NodeDef[] = [
  {
    type: "requestInputs",
    label: "Request-Inputs",
    description: "Define text or image inputs for this workflow",
    category: "OTHERS",
    icon: <Type className="w-4 h-4 text-orange-500" />,
  },
  {
    type: "gemini",
    label: "LLM Call",
    description: "Call Gemini to process text or images",
    category: "OTHERS",
    icon: <Cpu className="w-4 h-4 text-blue-500" />,
  },
  {
    type: "response",
    label: "Response",
    description: "Terminal node — collects workflow outputs",
    category: "OTHERS",
    icon: <Flag className="w-4 h-4 text-gray-700" />,
  },
  {
    type: "cropImage",
    label: "Crop Image",
    description: "Crop an image to specified dimensions via Transloadit (30s+)",
    category: "IMAGE",
    icon: <Image className="w-4 h-4 text-purple-500" />,
  },
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  const filtered = NODE_DEFS.filter(
    (n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ["OTHERS", "IMAGE"] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[440px] max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node list */}
        <div className="overflow-y-auto flex-1 py-2">
          {categories.map((cat) => {
            const nodes = filtered.filter((n) => n.category === cat);
            if (nodes.length === 0) return null;
            return (
              <div key={cat} className="mb-2">
                <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {cat}
                </p>
                {nodes.map((node) => (
                  <button
                    key={node.type}
                    onClick={() => {
                      onAdd(node.type);
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 bg-white">
                      {node.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{node.label}</p>
                      <p className="text-[11px] text-gray-400">{node.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No nodes match &ldquo;{search}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
