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
  setRingDragState: (ringDragState: RingDragState | null) => void;
  setNoteDragState: (noteDragState: NoteDragState | null) => void;
}

export const useSequencerUiStore = create<SequencerUiState>((set) => ({
  ringDragState: null,
  noteDragState: null,
  setRingDragState: (ringDragState) => set({ ringDragState }),
  setNoteDragState: (noteDragState) => set({ noteDragState }),
}));
