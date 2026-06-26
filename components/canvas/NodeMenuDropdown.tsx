"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/store/canvas";

interface Props {
  nodeId: string;
  canDelete: boolean;
  open: boolean;
  onClose: () => void;
}

export function NodeMenuDropdown({ nodeId, canDelete, open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const duplicateNodeCallback = useCanvasStore(s => s.duplicateNodeCallback);
  const duplicateWithEdgesCallback = useCanvasStore(s => s.duplicateWithEdgesCallback);
  const lockNodeCallback = useCanvasStore(s => s.lockNodeCallback);
  const deleteNodeCallback = useCanvasStore(s => s.deleteNodeCallback);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    // capture phase fires before React Flow can stop propagation
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [open, onClose]);

  if (!open) return null;

  const base =
    "relative flex w-full select-none items-center rounded-[14px] px-3 py-2 text-sm text-[#1b1b18] outline-none transition-colors text-left";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 overflow-hidden rounded-[18px] border border-gray-200/20 bg-[#F6F6F4] p-1 shadow-lg w-[200px] nodrag nowheel"
    >
      <button
        onClick={() => { duplicateNodeCallback?.(nodeId); onClose(); }}
        className={`${base} cursor-pointer hover:bg-gray-100`}
      >
        Duplicate
      </button>
      <button
        onClick={() => { duplicateWithEdgesCallback?.(nodeId); onClose(); }}
        className={`${base} cursor-pointer hover:bg-gray-100`}
      >
        Duplicate with Edges
      </button>
      <button
        onClick={() => { lockNodeCallback?.(nodeId); onClose(); }}
        className={`${base} cursor-pointer hover:bg-gray-100`}
      >
        Lock
      </button>
      <div className="my-0.5 border-t border-gray-200/60" />
      <button
        onClick={() => { if (canDelete) { deleteNodeCallback?.(nodeId); onClose(); } }}
        disabled={!canDelete}
        className={`${base} ${canDelete ? "cursor-pointer hover:bg-red-50 hover:text-red-600" : "opacity-40 cursor-not-allowed"}`}
      >
        Delete
      </button>
    </div>
  );
}
