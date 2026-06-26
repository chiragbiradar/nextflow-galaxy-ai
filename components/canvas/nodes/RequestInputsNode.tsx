"use client";

import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Plus, GripVertical, Copy, Trash2, Info, MoreHorizontal, Maximize2, Loader2, ImageIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import type { RequestInputsNodeData, RequestInputField } from "@/types/canvas";
import { NodeMenuDropdown } from "../NodeMenuDropdown";

type Props = NodeProps<Node<RequestInputsNodeData>>;

const HANDLE_STYLE = { background: "#f59e0b", width: 10, height: 10, border: "2px solid white" };

export function RequestInputsNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const fields: RequestInputField[] = data.fields ?? [];
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  function addField(type: "text" | "image") {
    const newField: RequestInputField = {
      id: nanoid(8),
      name: type === "text" ? "text_field" : "image_field",
      type,
      value: "",
    };
    updateNodeData(id, { fields: [...fields, newField] });
  }

  function removeField(fieldId: string) {
    updateNodeData(id, { fields: fields.filter((f) => f.id !== fieldId) });
  }

  function updateField(fieldId: string, key: "name" | "value", val: string) {
    updateNodeData(id, {
      fields: fields.map((f) => (f.id === fieldId ? { ...f, [key]: val } : f)),
    });
  }

  async function handleImageUpload(fieldId: string, file: File) {
    setUploading(prev => ({ ...prev, [fieldId]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json() as { url: string };
        if (url) updateField(fieldId, "value", url);
      }
    } finally {
      setUploading(prev => ({ ...prev, [fieldId]: false }));
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-72 text-xs relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-800 text-[13px]">Request-Inputs</span>
          <Info className="w-3 h-3 text-gray-400" />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => addField("text")}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Add field"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-500 nodrag"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-2 py-2 space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="group relative">
            <div className="flex items-center gap-1.5 mb-1">
              <GripVertical className="w-3 h-3 text-gray-300 shrink-0 cursor-grab" />
              <input
                value={field.name}
                onChange={(e) => updateField(field.id, "name", e.target.value)}
                className="flex-1 text-[11px] font-medium text-gray-700 bg-transparent border-none outline-none"
              />
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {field.type === "text" ? "Text" : "Image"}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(field.value)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeField(field.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {field.type === "text" ? (
              <div className="relative">
                <textarea
                  value={field.value}
                  onChange={(e) => updateField(field.id, "value", e.target.value)}
                  placeholder="Enter text..."
                  rows={3}
                  className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <button className="absolute bottom-1.5 right-1.5 p-0.5 rounded text-gray-300 hover:text-gray-500">
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(field.id, file);
                  }}
                />
                {uploading[field.id] ? (
                  <div className="flex items-center justify-center gap-1.5 h-10 border border-dashed border-amber-300 rounded-lg bg-amber-50 text-[11px] text-amber-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading…
                  </div>
                ) : field.value ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={field.value}
                      alt="uploaded"
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 rounded-lg transition-opacity text-[10px] text-white font-medium">
                      Change image
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 h-10 border border-dashed border-gray-200 rounded-lg text-[11px] text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Upload Image
                  </div>
                )}
              </label>
            )}

            {/* Output handle per field */}
            <Handle
              type="source"
              position={Position.Right}
              id={`field-${field.id}`}
              style={{ ...HANDLE_STYLE, top: "auto", bottom: "auto", right: -6 }}
            />
          </div>
        ))}

        {fields.length === 0 && (
          <div className="flex gap-2 py-1">
            <button
              onClick={() => addField("text")}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 border border-dashed border-gray-200 rounded-lg py-2 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" /> Text
            </button>
            <button
              onClick={() => addField("image")}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 border border-dashed border-gray-200 rounded-lg py-2 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" /> Image
            </button>
          </div>
        )}
      </div>

      <NodeMenuDropdown
        nodeId={id}
        canDelete={false}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
