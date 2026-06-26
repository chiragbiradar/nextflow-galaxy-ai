"use client";

import { X, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, Cpu, Image as ImageIcon, Type, Scissors } from "lucide-react";
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

function normalizeStatus(s: string) { return s.toUpperCase(); }

function formatDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function RunStatusIcon({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const s = normalizeStatus(status);
  if (s === "RUNNING") return <Loader2 className={cn(cls, "text-blue-500 animate-spin")} />;
  if (s === "COMPLETED") return <CheckCircle2 className={cn(cls, "text-green-500")} />;
  if (s === "FAILED") return <XCircle className={cn(cls, "text-red-500")} />;
  return <Clock className={cn(cls, "text-gray-400")} />;
}

function NodeTypeIcon({ type }: { type: string }) {
  if (type === "gemini") return <Cpu className="w-3 h-3 text-indigo-400" />;
  if (type === "cropImage") return <Scissors className="w-3 h-3 text-pink-400" />;
  if (type === "imageGen") return <ImageIcon className="w-3 h-3 text-blue-400" />;
  if (type === "requestInputs") return <Type className="w-3 h-3 text-amber-400" />;
  return <Cpu className="w-3 h-3 text-gray-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const s = normalizeStatus(status);
  return (
    <span className={cn(
      "text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
      s === "COMPLETED" ? "bg-green-100 text-green-700"
        : s === "FAILED" ? "bg-red-100 text-red-700"
        : s === "RUNNING" ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-500"
    )}>
      {s}
    </span>
  );
}

function OutputDisplay({ output, nodeType }: { output: unknown; nodeType: string }) {
  if (!output) return <p className="text-[10px] text-gray-400 italic">No output</p>;

  const isImageType = nodeType === "cropImage" || nodeType === "imageGen";
  const obj = typeof output === "object" ? output as Record<string, unknown> : null;

  // Image URL from object
  const imageUrl = obj?.url as string | undefined;
  if (imageUrl && (isImageType || imageUrl.startsWith("data:image") || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(imageUrl))) {
    return (
      <div className="space-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="output" className="w-full rounded-md border border-gray-200 object-cover max-h-40" />
        <p className="text-[9px] text-gray-400 truncate">{imageUrl.startsWith("data:") ? "[base64 image]" : imageUrl}</p>
      </div>
    );
  }

  // Text from object
  const text = obj?.text as string | undefined;
  const displayText = text ?? (typeof output === "string" ? output : JSON.stringify(output, null, 2));
  return (
    <div className="text-[10px] text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-2 whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed">
      {displayText}
    </div>
  );
}

function NodeRunRow({ nr }: { nr: NodeRun }) {
  const [open, setOpen] = useState(false);
  const s = normalizeStatus(nr.status);
  const hasOutput = !!nr.output && (typeof nr.output !== "object" || Object.keys(nr.output as object).length > 0);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => hasOutput && setOpen(v => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors",
          hasOutput ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
        )}
      >
        <span className="shrink-0">
          {hasOutput
            ? open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />
            : <span className="w-3 inline-block" />
          }
        </span>
        <NodeTypeIcon type={nr.nodeType} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-gray-700 truncate">{nr.nodeLabel}</p>
          <p className="text-[10px] text-gray-400">
            {nr.nodeType}
            {nr.durationMs != null && ` · ${nr.durationMs < 1000 ? `${nr.durationMs}ms` : `${(nr.durationMs / 1000).toFixed(1)}s`}`}
          </p>
        </div>
        <StatusBadge status={s} />
      </button>

      {open && hasOutput && (
        <div className="px-4 pb-3 pl-10">
          <OutputDisplay output={nr.output} nodeType={nr.nodeType} />
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: Run }) {
  const [expanded, setExpanded] = useState(false);
  const s = normalizeStatus(run.status);
  const dur = run.completedAt
    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null;
  const failedCount = run.nodeRuns.filter(nr => normalizeStatus(nr.status) === "FAILED").length;
  const doneCount = run.nodeRuns.filter(nr => normalizeStatus(nr.status) === "COMPLETED").length;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50/70 hover:bg-gray-100/70 text-left transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        }
        <RunStatusIcon status={s} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-gray-700">
            {formatDate(new Date(run.startedAt))}
          </p>
          <p className={cn(
            "text-[10px]",
            s === "COMPLETED" ? "text-green-600"
              : s === "FAILED" ? "text-red-500"
              : s === "RUNNING" ? "text-blue-500"
              : "text-gray-400"
          )}>
            {s}{dur != null ? ` · ${dur}s` : ""}
            {failedCount > 0 && ` · ${failedCount} failed`}
          </p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <StatusBadge status={s} />
          <span className="text-[9px] text-gray-400">
            {doneCount}/{run.nodeRuns.length} nodes
          </span>
        </div>
      </button>

      {expanded && (
        <div className="ml-2 border-l-2 border-gray-100">
          {run.nodeRuns.length === 0
            ? <p className="text-[10px] text-gray-400 px-4 py-2 italic">No node runs recorded</p>
            : run.nodeRuns.map(nr => <NodeRunRow key={nr.id} nr={nr} />)
          }
        </div>
      )}
    </div>
  );
}

export function HistorySidebar({ runs, onClose, isOpen }: Props) {
  // Auto-expand latest run
  const [, setDummy] = useState(0);
  void setDummy;

  return (
    <div className={cn(
      "absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col",
      "transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Run History</h3>
          <p className="text-[10px] text-gray-400">{runs.length} run{runs.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Clock className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No runs yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Run this workflow to see history here</p>
          </div>
        ) : (
          runs.map((run, i) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
