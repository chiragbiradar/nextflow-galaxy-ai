"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Plus, Search, Trash2, Pencil, Check, X } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SYSTEM_WORKFLOWS = [
  { id: "sys-racing", name: "AI Racing Car Generator", thumb: "/workflow-thumb.jpg" },
  { id: "sys-text", name: "Text Summarizer", thumb: null },
  { id: "sys-image", name: "Image Describer", thumb: null },
];

const CARD_GRADIENTS = [
  "from-violet-400 via-purple-500 to-indigo-600",
  "from-blue-400 via-cyan-500 to-teal-600",
  "from-amber-400 via-orange-500 to-red-500",
  "from-emerald-400 via-green-500 to-teal-600",
];

export function FlowDashboard({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleNew() {
    startTransition(async () => {
      const res = await fetch("/api/workflows", { method: "POST" });
      const wf = await res.json() as { id: string };
      router.push(`/workflows/${wf.id}/canvas`);
    });
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setDeletingId(id);
    await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    router.refresh();
    setDeletingId(null);
  }

  async function handleRename(id: string, name: string) {
    await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text) as { name?: string; nodes: unknown[]; edges: unknown[] };
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name ?? file.name.replace(".json", ""), nodes: data.nodes, edges: data.edges }),
    });
    const wf = await res.json() as { id: string };
    router.push(`/workflows/${wf.id}/canvas`);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build workflows or run models directly</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="sr-only"
            onChange={handleImport}
          />
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#3d3d41] bg-[#f5f5f5] rounded-lg hover:bg-[#ebebeb] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleNew}
            disabled={isPending}
            title="New workflow"
            className="w-9 h-9 flex items-center justify-center bg-[#444444] rounded-lg hover:bg-[#333333] transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-8">
        {/* System Workflows */}
        <div className="mb-8">
          <h2 className="text-base font-medium text-gray-900">System Workflows</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">Prebuilt workflow templates - click to open and start using.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {SYSTEM_WORKFLOWS.map((sw) => (
              <div
                key={sw.id}
                className="group flex flex-col border border-[#e0e0e2] rounded-2xl bg-[#f4f4f4] hover:shadow-sm cursor-pointer transition-all overflow-hidden"
              >
                <div className="h-40 shrink-0 overflow-hidden">
                  {sw.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sw.thumb} alt={sw.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600" />
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium text-gray-900 truncate">{sw.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Workflows */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium text-gray-900">Your Workflows</h2>
              <p className="text-xs text-gray-500 mt-0.5">Open one to edit, run, and review history.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-52"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-700">
                {search ? "No workflows match your search" : "No workflows yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? "Try a different search term" : "Create your first workflow to start building."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  deleting={deletingId === wf.id}
                  onDelete={(e) => handleDelete(wf.id, e)}
                  onRename={(name) => handleRename(wf.id, name)}
                  onClick={() => router.push(`/workflows/${wf.id}/canvas`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({
  workflow,
  deleting,
  onDelete,
  onRename,
  onClick,
}: {
  workflow: Workflow;
  deleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (name: string) => void;
  onClick: () => void;
}) {
  const idx = workflow.id.charCodeAt(0) % CARD_GRADIENTS.length;
  const gradient = CARD_GRADIENTS[idx];
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(workflow.name);

  const date = new Date(workflow.updatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditName(workflow.name);
    setEditing(true);
  }

  function commitEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (editName.trim() && editName !== workflow.name) onRename(editName.trim());
    setEditing(false);
  }

  function cancelEdit(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(false);
  }

  return (
    <div
      onClick={editing ? undefined : onClick}
      className="group flex flex-col border border-[#e0e0e2] rounded-2xl bg-white hover:shadow-sm cursor-pointer transition-all overflow-hidden"
    >
      <div className={`relative h-40 bg-gradient-to-br ${gradient} shrink-0`}>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/80 text-gray-500 hover:text-red-500 transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-3 py-2.5">
        {editing ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
              className="flex-1 text-sm font-medium text-gray-900 border-b border-gray-300 outline-none bg-transparent"
            />
            <button onClick={commitEdit} className="p-0.5 text-green-600 hover:text-green-700">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={cancelEdit} className="p-0.5 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/name">
            <p className="flex-1 text-sm font-medium text-gray-900 truncate">{workflow.name}</p>
            <button
              onClick={startEdit}
              className="opacity-0 group-hover/name:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 transition-opacity"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-0.5">Updated {date}</p>
      </div>
    </div>
  );
}
