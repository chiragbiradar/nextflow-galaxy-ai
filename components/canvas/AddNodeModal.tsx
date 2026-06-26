"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronRight, Clock, Image } from "lucide-react";
import React from "react";
import { LLM_MODELS } from "@/lib/llmModels";

interface NodeDef {
  type: string;
  label: string;
  category: "RECENT_ITEM" | "IMAGE" | "OTHERS";
  comingSoon?: boolean;
  subPanel?: "llm-models";
}

const NODE_DEFS: NodeDef[] = [
  { type: "cropImage",     label: "Crop Image",     category: "IMAGE" },
  { type: "requestInputs", label: "Request Inputs", category: "OTHERS" },
  { type: "gemini",        label: "LLM Call",       category: "OTHERS", subPanel: "llm-models" },
];

const CATEGORIES: { id: NodeDef["category"]; label: string; icon: React.ReactNode }[] = [
  { id: "IMAGE",  label: "IMAGE",  icon: <Image className="w-3 h-3" /> },
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
  onAdd: (type: string, extraData?: Record<string, unknown>) => void;
}

export function AddNodeModal({ open, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setRecent(getRecent());
      setModelPanelOpen(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { if (modelPanelOpen) setModelPanelOpen(false); else onClose(); } }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, modelPanelOpen]);

  if (!open) return null;

  function handleAdd(type: string, extraData?: Record<string, unknown>) {
    pushRecent(type);
    onAdd(type, extraData);
    onClose();
  }

  function handleNodeClick(node: NodeDef) {
    if (node.subPanel === "llm-models") {
      setModelPanelOpen(true);
    } else {
      handleAdd(node.type);
    }
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
    <div className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
      {/* Main panel */}
      <div className="w-64 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setModelPanelOpen(false); }}
            placeholder="Search nodes or models..."
            className="flex-1 text-[13px] text-gray-700 bg-transparent outline-none placeholder-gray-400"
          />
          {search ? (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
          ) : (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {filtered ? (
            <>
              {filtered.map(node => <NodeRow key={node.type} node={node} onNodeClick={handleNodeClick} isActive={modelPanelOpen && node.subPanel === "llm-models"} />)}
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-gray-400">No nodes match &ldquo;{search}&rdquo;</p>
              )}
            </>
          ) : (
            <>
              {recentDefs.length > 0 && (
                <div>
                  <CategoryLabel label="Recent" icon={<Clock className="w-3 h-3" />} />
                  {recentDefs.map(n => <NodeRow key={n.type} node={n} onNodeClick={handleNodeClick} isActive={false} />)}
                </div>
              )}
              {CATEGORIES.map(cat => {
                const nodes = NODE_DEFS.filter(n => n.category === cat.id);
                if (!nodes.length) return null;
                return (
                  <div key={cat.id}>
                    <CategoryLabel label={cat.label} icon={cat.icon} />
                    {nodes.map(n => <NodeRow key={n.type} node={n} onNodeClick={handleNodeClick} isActive={modelPanelOpen && n.subPanel === "llm-models"} />)}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* LLM model sub-panel */}
      {modelPanelOpen && (
        <div className="w-52 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <span className="text-[13px] font-semibold text-gray-800">LLM Call</span>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {LLM_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => handleAdd("gemini", { model: m.id, label: m.label })}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="text-[13px] text-gray-700">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
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

function NodeRow({ node, onNodeClick, isActive }: { node: NodeDef; onNodeClick: (n: NodeDef) => void; isActive: boolean }) {
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
      onClick={() => onNodeClick(node)}
      className={cn("w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left", isActive && "bg-gray-50")}
    >
      <span className="text-[13px] text-gray-700">{node.label}</span>
      <ChevronRight className={cn("w-3.5 h-3.5 transition-colors", isActive ? "text-indigo-500" : "text-gray-300")} />
    </button>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
