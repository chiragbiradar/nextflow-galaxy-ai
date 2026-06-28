"use client";

import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps, type Node } from "@xyflow/react";
import { Loader2, XCircle, Info, MoreHorizontal, ChevronRight, Play, Maximize2, Upload, RotateCcw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeminiNodeData, NodeStatus } from "@/types/canvas";
import { useState, useRef, useLayoutEffect } from "react";
import { useCanvasStore } from "@/store/canvas";
import type { RequestInputsNodeData } from "@/types/canvas";
import { NodeMenuDropdown } from "../NodeMenuDropdown";
import { LLM_MODELS, getModel } from "@/lib/llmModels";

type Props = NodeProps<Node<GeminiNodeData>>;

const TEXT_HANDLE  = { width: 14, height: 14, background: "#f59e0b", border: "2px solid #f59e0b80", boxShadow: "0 0 8px #f59e0b50" };
const IMAGE_HANDLE = { width: 14, height: 14, background: "#3b82f6", border: "2px solid #3b82f680", boxShadow: "0 0 8px #3b82f650" };
const VIDEO_HANDLE = { width: 14, height: 14, background: "#8b5cf6", border: "2px solid #8b5cf680", boxShadow: "0 0 8px #8b5cf650" };
const AUDIO_HANDLE = { width: 14, height: 14, background: "#10b981", border: "2px solid #10b98180", boxShadow: "0 0 8px #10b98150" };

// ── Setting sub-components ────────────────────────────────────────────────────

function SettingSlider({ label, value, min, max, step = 0.01, defaultVal, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; defaultVal: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-32 shrink-0 text-[11px] text-gray-600 flex items-center gap-0.5">
        {label} <Info className="w-3 h-3 text-gray-400 shrink-0" />
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="nodrag flex-1 min-w-0 h-1.5 accent-indigo-500 cursor-pointer" />
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="nodrag w-10 shrink-0 text-[11px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 text-center focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button onClick={() => onChange(defaultVal)} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
      <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(4)))} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
    </div>
  );
}

function SettingNumber({ label, value, defaultVal, onChange }: {
  label: string; value: number; defaultVal: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-32 shrink-0 text-[11px] text-gray-600 flex items-center gap-0.5">
        {label} <Info className="w-3 h-3 text-gray-400 shrink-0" />
      </span>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="nodrag w-20 text-[11px] text-gray-700 border border-gray-200 rounded px-2 py-0.5 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button onClick={() => onChange(defaultVal)} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><RotateCcw className="w-3 h-3" /></button>
      <button onClick={() => onChange(value + 1)} className="nodrag shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
    </div>
  );
}

function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-32 shrink-0 text-[11px] text-gray-600 flex items-center gap-0.5">
        {label} <Info className="w-3 h-3 text-gray-400 shrink-0" />
      </span>
      <button
        onClick={() => onChange(!value)}
        className={cn("nodrag relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0", value ? "bg-indigo-500" : "bg-gray-200")}
      >
        <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", value ? "translate-x-5" : "translate-x-1")} />
      </button>
      <span className="text-[11px] text-gray-500">{value ? "True" : "False"}</span>
      <button onClick={() => onChange(!value)} className="nodrag ml-auto shrink-0 p-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GeminiNode({ id, data }: Props) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const status = (data.status ?? "idle") as NodeStatus;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const runNodeCallback = useCanvasStore(s => s.runNodeCallback);

  const model = getModel(data.model ?? "gemini-2.5-pro");

  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  // refs for handle positioning
  const rootRef = useRef<HTMLDivElement>(null);
  const promptRowRef = useRef<HTMLDivElement>(null);
  const sysPromptRowRef = useRef<HTMLDivElement>(null);
  const visionRowRef = useRef<HTMLDivElement>(null);
  const videoRowRef = useRef<HTMLDivElement>(null);
  const audioRowRef = useRef<HTMLDivElement>(null);
  const responseRowRef = useRef<HTMLDivElement>(null);

  const [tops, setTops] = useState({ prompt: 80, sysPrompt: 170, vision: 260, video: 300, audio: 340, response: 420 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    function measure() {
      const refs = [
        { key: "prompt",    ref: promptRowRef },
        { key: "sysPrompt", ref: sysPromptRowRef },
        { key: "vision",    ref: visionRowRef },
        { key: "video",     ref: videoRowRef },
        { key: "audio",     ref: audioRowRef },
        { key: "response",  ref: responseRowRef },
      ] as const;
      const next: Partial<typeof tops> = {};
      for (const { key, ref } of refs) {
        if (ref.current) next[key] = ref.current.offsetTop + ref.current.offsetHeight / 2;
      }
      setTops(prev => ({ ...prev, ...next }));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, model.vision, model.audio, model.video]);

  const promptEdge = edges.find(e => e.target === id && (e.targetHandle === "prompt" || !e.targetHandle));
  const isPromptConnected = !!promptEdge;
  const visionEdges = edges.filter(e => e.target === id && e.targetHandle === "image-vision");
  const isVisionConnected = visionEdges.length > 0;

  let connectedPromptValue = "";
  if (isPromptConnected && promptEdge) {
    const srcNode = allNodes.find(n => n.id === promptEdge.source);
    if (srcNode) {
      if (srcNode.type === "requestInputs") {
        const fieldId = promptEdge.sourceHandle?.replace("field-", "");
        const field = ((srcNode.data as RequestInputsNodeData).fields ?? []).find(f => f.id === fieldId);
        connectedPromptValue = field?.value ?? "";
      } else {
        // gemini, cropImage, or any node that stores text output in data.output
        connectedPromptValue = (typeof srcNode.data.output === "string" ? srcNode.data.output : "") ?? "";
      }
    }
  }

  const connectedVisionImages: string[] = [];
  for (const ve of visionEdges) {
    const srcNode = allNodes.find(n => n.id === ve.source);
    if (!srcNode) continue;
    if (typeof srcNode.data.output === "string" && srcNode.data.output) connectedVisionImages.push(srcNode.data.output);
    if (srcNode.type === "requestInputs" && ve.sourceHandle?.startsWith("field-")) {
      const fieldId = ve.sourceHandle.replace("field-", "");
      const field = ((srcNode.data as RequestInputsNodeData).fields ?? []).find(f => f.id === fieldId);
      if (field?.value) connectedVisionImages.push(field.value);
    }
  }

  function set(patch: Partial<GeminiNodeData>) { updateNodeData(id, patch); }

  const isRunning = status === "running";
  const isFailed = status === "failed";

  return (
    <div ref={rootRef} className={cn(
      "bg-white rounded-xl border w-[300px] text-xs transition-shadow relative",
      isRunning ? "border-amber-400 shadow-2xl shadow-amber-100 ring-2 ring-amber-300 ring-opacity-60 animate-pulse" : "border-gray-200 shadow-2xl"
    )}>
      {/* Handles */}
      <Handle type="target" id="prompt"       position={Position.Left}  style={{ ...TEXT_HANDLE,  top: tops.prompt }} />
      <Handle type="target" id="system-prompt" position={Position.Left} style={{ ...TEXT_HANDLE,  top: tops.sysPrompt }} />
      {model.vision && <Handle type="target" id="image-vision" position={Position.Left} style={{ ...IMAGE_HANDLE, top: tops.vision }} />}
      {model.video  && <Handle type="target" id="video"        position={Position.Left} style={{ ...VIDEO_HANDLE, top: tops.video }} />}
      {model.audio  && <Handle type="target" id="audio"        position={Position.Left} style={{ ...AUDIO_HANDLE, top: tops.audio }} />}
      <Handle type="source" id="response"     position={Position.Right} style={{ ...TEXT_HANDLE,  top: tops.response }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative nodrag">
            <select
              value={data.model ?? "gemini-3.1-pro-preview"}
              onChange={e => {
                const m = LLM_MODELS.find(x => x.id === e.target.value);
                set({ model: e.target.value, label: m?.label ?? "LLM Call" });
              }}
              className="font-semibold text-gray-900 text-[13px] bg-transparent border-none outline-none appearance-none pr-4 cursor-pointer hover:text-indigo-600 max-w-[150px] truncate"
            >
              {LLM_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <Info className="w-3 h-3 text-gray-400 shrink-0" />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className={cn(
              "nodrag flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              isRunning ? "bg-emerald-50 text-emerald-600 cursor-not-allowed"
                : isFailed ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            )}
            disabled={isRunning}
            onClick={() => runNodeCallback?.([id])}
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Play className="w-2.5 h-2.5 fill-emerald-500" />}
            <span>{isRunning ? "Running" : isFailed ? "Failed" : "Run"}</span>
          </button>
          <button className="p-1 rounded hover:bg-gray-100 text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 space-y-0">

        {/* Prompt */}
        <div ref={promptRowRef} className="py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600 flex items-center gap-0.5">
              Prompt<span className="text-red-400">*</span> <Info className="w-3 h-3 text-gray-400" />
              {isPromptConnected && <span className="ml-1 text-purple-500 text-[9px] normal-case">← connected</span>}
            </span>
            <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="relative">
            <textarea
              placeholder={isPromptConnected ? "Connected from input..." : "Enter your prompt..."}
              disabled={isPromptConnected}
              value={isPromptConnected ? connectedPromptValue : (data.prompt ?? "")}
              onChange={e => set({ prompt: e.target.value })}
              rows={3}
              className={cn(
                "w-full text-[11px] border rounded-lg px-2 py-1.5 resize-none",
                isPromptConnected ? "text-gray-700 border-purple-200 bg-purple-50 cursor-default" : "text-gray-700 border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
              )}
            />
            <button className="absolute bottom-1.5 right-1.5 p-0.5 rounded text-gray-300 hover:text-gray-500"><Maximize2 className="w-3 h-3" /></button>
          </div>
        </div>

        {/* System Prompt */}
        <div ref={sysPromptRowRef} className="py-1.5 border-t border-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-gray-600 flex items-center gap-0.5">System Prompt <Info className="w-3 h-3 text-gray-400" /></span>
            <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
          </div>
          <div className="relative">
            <textarea
              value={data.systemPrompt ?? ""}
              onChange={e => set({ systemPrompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={3}
              className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
            <button className="absolute bottom-1.5 right-1.5 p-0.5 rounded text-gray-300 hover:text-gray-500"><Maximize2 className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Image (Vision) — conditional */}
        {model.vision && (
          <div ref={visionRowRef} className="py-1.5 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-600 flex items-center gap-0.5">
                Image (Vision) <Info className="w-3 h-3 text-gray-400" />
                {isVisionConnected && <span className="ml-1 text-blue-500 text-[9px] normal-case">← {visionEdges.length}</span>}
              </span>
              <div className="flex items-center gap-1">
                <button className="nodrag flex items-center gap-1 text-[10px] text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50" onClick={() => imageFileRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Upload Image
                </button>
                <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            <input ref={imageFileRef} type="file" accept="image/*" className="hidden" />
            {isVisionConnected && connectedVisionImages.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {connectedVisionImages.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-14 w-14 rounded object-cover border border-blue-200" />
                ))}
              </div>
            )}
            <p className="text-[10px] text-blue-400 mt-0.5">Upload requirements</p>
          </div>
        )}

        {/* Video — conditional */}
        {model.video && (
          <div ref={videoRowRef} className="py-1.5 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-600 flex items-center gap-0.5">Video <Info className="w-3 h-3 text-gray-400" /></span>
              <div className="flex items-center gap-1">
                <button className="nodrag flex items-center gap-1 text-[10px] text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50" onClick={() => videoFileRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Upload Video
                </button>
                <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            <input ref={videoFileRef} type="file" accept="video/*" className="hidden" />
          </div>
        )}

        {/* Audio — conditional */}
        {model.audio && (
          <div ref={audioRowRef} className="py-1.5 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-600 flex items-center gap-0.5">Audio <Info className="w-3 h-3 text-gray-400" /></span>
              <div className="flex items-center gap-1">
                <button className="nodrag flex items-center gap-1 text-[10px] text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50" onClick={() => audioFileRef.current?.click()}>
                  <Upload className="w-3 h-3" /> Upload Audio
                </button>
                <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
            <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" />
          </div>
        )}

        {/* Settings toggle */}
        <div className="border-t border-gray-50 pt-1.5">
          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="nodrag flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 py-1"
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", settingsOpen && "rotate-90")} />
            Settings
          </button>

          {settingsOpen && (
            <div className="space-y-0 divide-y divide-gray-50 mt-1">
              <SettingSlider label="Temperature"        value={data.temperature ?? 0.7} min={0} max={2}   step={0.01} defaultVal={0.7} onChange={v => set({ temperature: v })} />
              <SettingNumber label="Max Tokens"         value={data.maxTokens ?? 1024}                    defaultVal={1024}           onChange={v => set({ maxTokens: v })} />
              <SettingToggle label="Reasoning"          value={data.reasoning ?? false}                                               onChange={v => set({ reasoning: v })} />
              <SettingSlider label="Top P"              value={data.topP ?? 1}          min={0} max={1}   step={0.01} defaultVal={1}   onChange={v => set({ topP: v })} />
              <SettingSlider label="Top K"              value={data.topK ?? 0}          min={0} max={100} step={1}    defaultVal={0}   onChange={v => set({ topK: v })} />
              <SettingSlider label="Frequency Penalty"  value={data.frequencyPenalty ?? 0} min={-2} max={2} step={0.01} defaultVal={0} onChange={v => set({ frequencyPenalty: v })} />
              <SettingSlider label="Presence Penalty"   value={data.presencePenalty ?? 0}  min={-2} max={2} step={0.01} defaultVal={0} onChange={v => set({ presencePenalty: v })} />
              <SettingSlider label="Repetition Penalty" value={data.repetitionPenalty ?? 1} min={0}  max={2} step={0.01} defaultVal={1} onChange={v => set({ repetitionPenalty: v })} />
              <SettingSlider label="Min P"              value={data.minP ?? 0}          min={0} max={1}   step={0.01} defaultVal={0}   onChange={v => set({ minP: v })} />
              <SettingSlider label="Top A"              value={data.topA ?? 0}          min={0} max={1}   step={0.01} defaultVal={0}   onChange={v => set({ topA: v })} />
              <SettingNumber label="Seed"               value={data.seed ?? 0}                            defaultVal={0}              onChange={v => set({ seed: v })} />
              <div className="py-1.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-600 flex items-center gap-0.5">Stop Sequences <Info className="w-3 h-3 text-gray-400" /></span>
                  <button className="nodrag p-0.5 rounded hover:bg-gray-100 text-gray-400"><Plus className="w-3 h-3" /></button>
                </div>
                <div className="relative">
                  <textarea
                    value={data.stopSequences ?? ""}
                    onChange={e => set({ stopSequences: e.target.value })}
                    placeholder="e.g. END, STOP, ###"
                    rows={2}
                    className="w-full text-[11px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <button className="absolute bottom-1.5 right-1.5 p-0.5 rounded text-gray-300 hover:text-gray-500"><Maximize2 className="w-3 h-3" /></button>
                </div>
              </div>
              <SettingToggle label="JSON Mode" value={data.jsonMode ?? false} onChange={v => set({ jsonMode: v })} />
            </div>
          )}
        </div>

        {/* Response */}
        <div ref={responseRowRef} className="border-t border-gray-100 pt-2 pb-1 mt-1">
          <span className="text-[11px] font-medium text-gray-600">Response</span>
          {(status === "completed" || isFailed) ? (
            <div className={cn(
              "mt-1 text-[11px] border rounded-lg px-2 py-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap",
              isFailed ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-700"
            )}>
              {data.output ?? "No output"}
              {data.durationMs != null && <span className="block mt-1 text-[10px] text-gray-400">({data.durationMs}ms)</span>}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">No output yet</p>
          )}
          <div className="flex justify-end mt-1">
            <span className="text-[9px] text-gray-400">-0.0001 M</span>
          </div>
        </div>
      </div>

      <NodeMenuDropdown nodeId={id} canDelete={true} open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
