"use client";

import { X, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NodeRun {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: string;
  durationMs: number | null;
  output?: unknown;
  startedAt: string;
}

interface Run {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  nodeRuns: NodeRun[];
}

interface Props {
  runs: Run[];
  onClose: () => void;
  isOpen: boolean;
}

function formatDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function RunStatusIcon({ status }: { status: string }) {
  if (status === "RUNNING") return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
  if (status === "COMPLETED") return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === "FAILED") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
}

function NodeStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  return (
    <span className={cn(
      "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
      s === "COMPLETED" ? "bg-green-100 text-green-700"
        : s === "FAILED" ? "bg-red-100 text-red-700"
        : s === "RUNNING" ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-500"
    )}>
      {s}
    </span>
  );
}

function formatOutput(output: unknown): string {
  if (!output) return "";
  if (typeof output === "string") return output.substring(0, 120);
  if (typeof output === "object" && "text" in (output as object)) {
    return String((output as { text: string }).text).substring(0, 120);
  }
  if (typeof output === "object" && "outputUrl" in (output as object)) {
    return "[Image output]";
  }
  return JSON.stringify(output).substring(0, 120);
}

function NodeRunRow({ nr }: { nr: NodeRun }) {
  const [open, setOpen] = useState(false);
  const preview = formatOutput(nr.output);

  return (
    <div className="ml-2 border-l border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
        }
        <RunStatusIcon status={nr.status} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-700 truncate">{nr.nodeLabel}</p>
          <p className="text-[10px] text-gray-400">
            {nr.nodeType}{nr.durationMs != null && ` · ${nr.durationMs}ms`}
          </p>
        </div>
        <NodeStatusBadge status={nr.status} />
      </button>

      {open && (
        <div className="px-4 pb-2 ml-8">
          {preview ? (
            <div className="text-[10px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 whitespace-pre-wrap break-words">
              {preview}
              {preview.length >= 120 && <span className="text-gray-400">…</span>}
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 italic">No output</p>
          )}
        </div>
      )}
    </div>
  );
}

export function HistorySidebar({ runs, onClose, isOpen }: Props) {
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(() => {
    // Auto-expand latest run
    const latest = runs[0];
    return latest ? new Set([latest.id]) : new Set();
  });

  function toggleRun(runId: string) {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }

  return (
    <div className={cn(
      "absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col",
      "transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Run History</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Clock className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No runs yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Run this workflow to see history here</p>
          </div>
        )}

        {runs.map((run) => {
          const expanded = expandedRuns.has(run.id);
          return (
            <div key={run.id} className="border-b border-gray-50 last:border-0">
              {/* Run header — click to expand/collapse */}
              <button
                onClick={() => toggleRun(run.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
              >
                {expanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                }
                <RunStatusIcon status={run.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {formatDate(new Date(run.startedAt))}
                  </p>
                  <p className={cn(
                    "text-[10px]",
                    run.status === "COMPLETED" && "text-green-600",
                    run.status === "FAILED" && "text-red-600",
                    run.status === "RUNNING" && "text-blue-600",
                    run.status === "PENDING" && "text-gray-400"
                  )}>
                    {run.status}
                    {run.completedAt && ` · ${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {run.nodeRuns.length} node{run.nodeRuns.length !== 1 ? "s" : ""}
                </span>
              </button>

              {/* Node runs — shown when expanded */}
              {expanded && run.nodeRuns.map((nr) => (
                <NodeRunRow key={nr.id} nr={nr} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
