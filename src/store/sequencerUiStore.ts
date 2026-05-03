import { create } from "zustand";

export interface RingDragState {
  ringId: string;
  initialOffset: number;
  previewOffset: number;
  startPosition: number;
  isRotating: boolean;
}

export interface NoteDragState {
  ringId: string;
  noteIndex: number;
  startDistance: number;
  initialLevel: number;
  dragRange: number;
  previewLevel: number;
}

interface SequencerUiState {
  ringDragState: RingDragState | null;
  noteDragState: NoteDragState | null;
  showCentroidArrow: boolean;
  showLbdmGrouping: boolean;
  lbdmGroupingEdges: Array<{
    fromNote: number;
    toNote: number;
    isMutual: boolean;
  }>;
  setRingDragState: (ringDragState: RingDragState | null) => void;
  setNoteDragState: (noteDragState: NoteDragState | null) => void;
  setShowCentroidArrow: (showCentroidArrow: boolean) => void;
  setShowLbdmGrouping: (showLbdmGrouping: boolean) => void;
  setLbdmGroupingEdges: (
    lbdmGroupingEdges: Array<{
      fromNote: number;
      toNote: number;
      isMutual: boolean;
    }>,
  ) => void;
  toggleCentroidArrow: () => void;
  toggleLbdmGrouping: () => void;
}

export const useSequencerUiStore = create<SequencerUiState>((set) => ({
  ringDragState: null,
  noteDragState: null,
  showCentroidArrow: false,
  showLbdmGrouping: false,
  lbdmGroupingEdges: [],
  setRingDragState: (ringDragState) => set({ ringDragState }),
  setNoteDragState: (noteDragState) => set({ noteDragState }),
  setShowCentroidArrow: (showCentroidArrow) => set({ showCentroidArrow }),
  setShowLbdmGrouping: (showLbdmGrouping) => set({ showLbdmGrouping }),
  setLbdmGroupingEdges: (lbdmGroupingEdges) => set({ lbdmGroupingEdges }),
  toggleCentroidArrow: () =>
    set((state) => ({ showCentroidArrow: !state.showCentroidArrow })),
  toggleLbdmGrouping: () =>
    set((state) => ({ showLbdmGrouping: !state.showLbdmGrouping })),
}));
