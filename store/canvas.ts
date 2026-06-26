import { create } from "zustand";

type CanvasUIStore = {
  workflowName: string;
  isHistoryOpen: boolean;
  isMiniMapVisible: boolean;
  runNodeCallback: ((nodeIds: string[]) => void) | null;
  deleteNodeCallback: ((nodeId: string) => void) | null;
  duplicateNodeCallback: ((nodeId: string) => void) | null;
  duplicateWithEdgesCallback: ((nodeId: string) => void) | null;
  lockNodeCallback: ((nodeId: string) => void) | null;
  setWorkflowName: (name: string) => void;
  toggleHistory: () => void;
  toggleMiniMap: () => void;
  setRunNodeCallback: (fn: ((nodeIds: string[]) => void) | null) => void;
  setDeleteNodeCallback: (fn: ((nodeId: string) => void) | null) => void;
  setDuplicateNodeCallback: (fn: ((nodeId: string) => void) | null) => void;
  setDuplicateWithEdgesCallback: (fn: ((nodeId: string) => void) | null) => void;
  setLockNodeCallback: (fn: ((nodeId: string) => void) | null) => void;
};

export const useCanvasStore = create<CanvasUIStore>((set) => ({
  workflowName: "Untitled",
  isHistoryOpen: false,
  isMiniMapVisible: true,
  runNodeCallback: null,
  deleteNodeCallback: null,
  duplicateNodeCallback: null,
  duplicateWithEdgesCallback: null,
  lockNodeCallback: null,
  setWorkflowName: (name) => set({ workflowName: name }),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  toggleMiniMap: () => set((s) => ({ isMiniMapVisible: !s.isMiniMapVisible })),
  setRunNodeCallback: (fn) => set({ runNodeCallback: fn }),
  setDeleteNodeCallback: (fn) => set({ deleteNodeCallback: fn }),
  setDuplicateNodeCallback: (fn) => set({ duplicateNodeCallback: fn }),
  setDuplicateWithEdgesCallback: (fn) => set({ duplicateWithEdgesCallback: fn }),
  setLockNodeCallback: (fn) => set({ lockNodeCallback: fn }),
}));
