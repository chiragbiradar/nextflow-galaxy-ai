"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Plus, Search, Trash2, GitBranch } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function FlowDashboard({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleNew() {
    startTransition(async () => {
      const res = await fetch("/api/workflows", { method: "POST" });
      const wf = await res.json();
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Flow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build workflows or run models directly</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleNew}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {isPending ? "Creating..." : "New workflow"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6">
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
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {search ? "No workflows match your search" : "No workflows yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {search ? "Try a different search term" : "Create your first workflow to start building."}
              </p>
              {!search && (
                <button
                  onClick={handleNew}
                  disabled={isPending}
                  className="mt-4 flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  Create workflow
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  deleting={deletingId === wf.id}
                  onDelete={(e) => handleDelete(wf.id, e)}
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
  onClick,
}: {
  workflow: Workflow;
  deleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const date = new Date(workflow.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col justify-between p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <GitBranch className="w-4 h-4 text-gray-500" />
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 truncate">{workflow.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">Updated {date}</p>
      </div>
    </div>
  );
}
