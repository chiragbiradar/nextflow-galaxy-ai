import { create } from "zustand";

type CanvasUIStore = {
  workflowName: string;
  isHistoryOpen: boolean;
  isMiniMapVisible: boolean;
  setWorkflowName: (name: string) => void;
  toggleHistory: () => void;
  toggleMiniMap: () => void;
};

export const useCanvasStore = create<CanvasUIStore>((set) => ({
  workflowName: "Untitled",
  isHistoryOpen: false,
  isMiniMapVisible: true,
  setWorkflowName: (name) => set({ workflowName: name }),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  toggleMiniMap: () => set((s) => ({ isMiniMapVisible: !s.isMiniMapVisible })),
}));
