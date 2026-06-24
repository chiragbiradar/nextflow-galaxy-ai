"use client";

import { X, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeRun {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: string;
  durationMs: number | null;
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
}

function RunIcon({ status }: { status: string }) {
  if (status === "RUNNING") return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
  if (status === "COMPLETED") return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  if (status === "FAILED") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  return <Clock className="w-3.5 h-3.5 text-gray-400" />;
}

export function HistorySidebar({ runs, onClose }: Props) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
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

        {runs.map((run) => (
          <div key={run.id} className="border-b border-gray-50 last:border-0">
            {/* Run header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50">
              <RunIcon status={run.status} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {new Date(run.startedAt).toLocaleString()}
                </p>
                <p
                  className={cn(
                    "text-[10px]",
                    run.status === "COMPLETED" && "text-green-600",
                    run.status === "FAILED" && "text-red-600",
                    run.status === "RUNNING" && "text-blue-600",
                    run.status === "PENDING" && "text-gray-400"
                  )}
                >
                  {run.status}
                  {run.completedAt &&
                    ` · ${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`}
                </p>
              </div>
            </div>

            {/* Node runs */}
            {run.nodeRuns.map((nr) => (
              <div key={nr.id} className="flex items-center gap-2 px-4 py-2 ml-2">
                <RunIcon status={nr.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-700 truncate">{nr.nodeLabel}</p>
                  <p className="text-[10px] text-gray-400">
                    {nr.nodeType}
                    {nr.durationMs != null && ` · ${nr.durationMs}ms`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
