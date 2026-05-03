import { create } from "zustand";
import { DEFAULT_RINGS, GROOVE_PRESETS, PRESETS, RING_TEMPLATES } from "../lib/presets";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingPhaseOffset,
  changeRingVoice,
  clamp,
  clampBpm,
  normalizeNoteLevels,
  setNoteLevel,
  toggleNote,
  toggleNoteLevel,
  USER_PRESET_CATEGORY,
  type DrumVoice,
  type GroovePreset,
  type Preset,
  type Ring,
  type TransportState,
} from "../lib/rhythm";
import {
  loadAppState,
  loadTransportSettings,
  loadUserPresets,
  saveAppState,
  saveTransportSettings,
  saveUserPresets,
  type StoredPresetPanelState,
} from "../lib/storage";
import { useSequencerUiStore } from "./sequencerUiStore";

export const MAX_TRACKS = 5;
export const TRACK_COLORS = [
  "#ff6b35",
  "#f7c948",
  "#6ee7b7",
  "#60a5fa",
  "#f472b6",
];
export const CYCLE_BUCKET_COUNT = 16;
export const INACTIVE_CYCLE_BUCKET = -1;

export function getTrackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length];
}

export function createCycleBuckets(): number[] {
  return Array.from({ length: CYCLE_BUCKET_COUNT }, () => INACTIVE_CYCLE_BUCKET);
}

export function getCycleBucketIndex(position: number): number {
  return ((Math.round(position * CYCLE_BUCKET_COUNT) % CYCLE_BUCKET_COUNT) + CYCLE_BUCKET_COUNT) % CYCLE_BUCKET_COUNT;
}

const INITIAL_TRANSPORT: TransportState = {
  bpm: 112,
  masterVolume: 0.82,
  isPlaying: false,
  cyclePosition: 0,
  cycleBuckets: createCycleBuckets(),
};

interface RhythmState {
  rings: Ring[];
  selectedRingId: string;
  transport: TransportState;
  presetPanel: StoredPresetPanelState;
  userGrooves: GroovePreset[];
  userTrackPresets: Preset[];
  settingsLoaded: boolean;
  hydrate: () => Promise<void>;
  setCyclePosition: (cyclePosition: number) => void;
  togglePlayback: () => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  setPresetPanelState: (panelState: Partial<StoredPresetPanelState>) => void;
  selectRing: (ringId: string) => void;
  toggleNote: (ringId: string, noteIndex: number) => void;
  setNoteLevel: (ringId: string, noteIndex: number, level: number) => void;
  changeRingDivision: (ringId: string, division: number) => void;
  changeRingPhaseOffset: (ringId: string, phaseOffset: number) => void;
  changeRingVolume: (ringId: string, volume: number) => void;
  changeRingVoice: (ringId: string, voice: DrumVoice) => void;
  replaceRingNotes: (ringId: string, notes: number[]) => void;
  toggleCentroidArrowVisibility: () => void;
  toggleLbdmGroupingVisibility: () => void;
  addRing: () => void;
  deleteRing: (ringId: string) => void;
  applyTrackPreset: (presetId: string) => void;
  applyGroovePreset: (presetId: string) => void;
  saveGroovePreset: (name: string) => void;
  saveTrackPreset: (name: string) => void;
  deleteGroovePreset: (presetId: string) => void;
  deleteTrackPreset: (presetId: string) => void;
}

function createRingsFromGroove(groove: GroovePreset): Ring[] {
  const createdAt = Date.now();
  return groove.rings.slice(0, MAX_TRACKS).map((ring, index) => ({
    ...ring,
    phaseOffset: clamp(ring.phaseOffset ?? 0, 0, 1),
    id: `${groove.id}-${index}-${createdAt}`,
    label: `${ring.label} ${index + 1}`,
  }));
}

function normalizeStoredRings(rings: Ring[]): Ring[] {
  return rings.slice(0, MAX_TRACKS).map((ring) => {
    const ringWithDivision = changeRingDivision(ring, ring.division);
    return {
      ...ringWithDivision,
      phaseOffset: clamp(ring.phaseOffset ?? 0, 0, 1),
      volume: clamp(ring.volume, 0, 1),
    };
  });
}

function persistUserPresets(grooves: GroovePreset[], tracks: Preset[]): void {
  saveUserPresets(grooves, tracks).catch((error) => {
    console.error("Failed to save user presets", error);
  });
}

function persistTransportSettings(transport: TransportState): void {
  saveTransportSettings({
    bpm: transport.bpm,
    masterVolume: transport.masterVolume,
  }).catch((error) => {
    console.error("Failed to save transport settings", error);
  });
}

function persistAppState(state: RhythmState): void {
  if (!state.settingsLoaded) {
    return;
  }

  saveAppState({
    rings: state.rings,
    selectedRingId: state.selectedRingId,
    presetPanel: state.presetPanel,
    showCentroidArrow: useSequencerUiStore.getState().showCentroidArrow,
    showLbdmGrouping: useSequencerUiStore.getState().showLbdmGrouping,
  }).catch((error) => {
    console.error("Failed to save app state", error);
  });
}

type SetRhythmState = (
  partial: Partial<RhythmState> | ((state: RhythmState) => Partial<RhythmState>),
  replace?: false,
) => void;

function updateAndPersist(
  set: SetRhythmState,
  get: () => RhythmState,
  partial: Partial<Pick<RhythmState, "rings" | "selectedRingId" | "presetPanel">>,
): void {
  set(partial);
  persistAppState(get());
}

export const useRhythmStore = create<RhythmState>((set, get) => ({
  rings: DEFAULT_RINGS,
  selectedRingId: DEFAULT_RINGS[0]?.id ?? "",
  transport: INITIAL_TRANSPORT,
  presetPanel: {
    mode: "grooves",
    category: "",
    selectedPresetId: "",
  },
  userGrooves: [],
  userTrackPresets: [],
  settingsLoaded: false,

  hydrate: async () => {
    try {
      const [storedPresets, storedSettings, storedAppState] = await Promise.all([
        loadUserPresets(),
        loadTransportSettings(),
        loadAppState(),
      ]);
      const storedRings = storedAppState?.rings?.length
        ? normalizeStoredRings(storedAppState.rings)
        : undefined;
      const storedSelectedRingId = storedAppState?.selectedRingId;
      useSequencerUiStore
        .getState()
        .setShowCentroidArrow(storedAppState?.showCentroidArrow ?? false);
      useSequencerUiStore
        .getState()
        .setShowLbdmGrouping(storedAppState?.showLbdmGrouping ?? false);

      set((state) => ({
        rings: storedRings ?? state.rings,
        selectedRingId: storedRings?.some((ring) => ring.id === storedSelectedRingId)
          ? storedSelectedRingId
          : storedRings?.[0]?.id ?? state.selectedRingId,
        presetPanel: storedAppState?.presetPanel ?? state.presetPanel,
        userGrooves: storedPresets.grooves,
        userTrackPresets: storedPresets.tracks,
        transport: storedSettings
          ? {
              ...state.transport,
              bpm: clampBpm(storedSettings.bpm),
              masterVolume: clamp(storedSettings.masterVolume, 0, 1),
            }
          : state.transport,
        settingsLoaded: true,
      }));
    } catch (error) {
      console.error("Failed to load stored settings", error);
      set({ settingsLoaded: true });
    }
  },

  setCyclePosition: (cyclePosition) => {
    const nextActiveBucket = getCycleBucketIndex(cyclePosition);
    set((state) => ({
      transport: {
        ...state.transport,
        cyclePosition,
        cycleBuckets: (() => {
          const nextBuckets = createCycleBuckets();
          nextBuckets[nextActiveBucket] = cyclePosition;
          return nextBuckets;
        })(),
      },
    }));
  },

  togglePlayback: () => {
    set((state) => ({
      transport: {
        ...state.transport,
        isPlaying: !state.transport.isPlaying,
      },
    }));
  },

  setBpm: (bpm) => {
    set((state) => {
      const transport = {
        ...state.transport,
        bpm: clampBpm(bpm),
      };
      if (state.settingsLoaded) {
        persistTransportSettings(transport);
      }
      return { transport };
    });
  },

  setMasterVolume: (volume) => {
    set((state) => {
      const transport = {
        ...state.transport,
        masterVolume: clamp(volume, 0, 1),
      };
      if (state.settingsLoaded) {
        persistTransportSettings(transport);
      }
      return { transport };
    });
  },

  setPresetPanelState: (panelState) => {
    const nextPresetPanel = {
      ...get().presetPanel,
      ...panelState,
    };
    updateAndPersist(set, get, { presetPanel: nextPresetPanel });
  },

  selectRing: (ringId) => {
    if (get().selectedRingId === ringId) {
      return;
    }
    updateAndPersist(set, get, { selectedRingId: ringId });
  },

  toggleNote: (ringId, noteIndex) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId
        ? {
            ...ring,
            notes: toggleNote(ring.notes, noteIndex, ring.division),
            noteLevels: toggleNoteLevel(ring.noteLevels, ring.notes, noteIndex, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  setNoteLevel: (ringId, noteIndex, level) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId
        ? {
            ...ring,
            noteLevels: setNoteLevel(ring.noteLevels, ring.notes, noteIndex, level, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  changeRingDivision: (ringId, division) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId ? changeRingDivision(ring, division) : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  changeRingPhaseOffset: (ringId, phaseOffset) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId ? changeRingPhaseOffset(ring, phaseOffset) : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  changeRingVolume: (ringId, volume) => {
    const nextVolume = clamp(volume, 0, 1);
    const currentRings = get().rings;
    const targetRing = currentRings.find((ring) => ring.id === ringId);
    if (!targetRing || targetRing.volume === nextVolume) {
      return;
    }

    const nextRings = currentRings.map((ring) =>
      ring.id === ringId ? { ...ring, volume: nextVolume } : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  changeRingVoice: (ringId, voice) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId ? changeRingVoice(ring, voice) : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  replaceRingNotes: (ringId, notes) => {
    const nextRings = get().rings.map((ring) =>
      ring.id === ringId
        ? {
            ...ring,
            notes,
            noteLevels: normalizeNoteLevels(ring.noteLevels, notes, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  toggleCentroidArrowVisibility: () => {
    useSequencerUiStore.getState().toggleCentroidArrow();
    persistAppState(get());
  },

  toggleLbdmGroupingVisibility: () => {
    useSequencerUiStore.getState().toggleLbdmGrouping();
    persistAppState(get());
  },

  addRing: () => {
    const state = get();
    if (state.rings.length >= MAX_TRACKS) {
      return;
    }

    const template =
      RING_TEMPLATES.find((item) => !state.rings.some((ring) => ring.voice === item.voice)) ??
      RING_TEMPLATES[state.rings.length % RING_TEMPLATES.length];
    const nextRing: Ring = {
      ...template,
      id: `${template.id}-${Date.now()}`,
      label: `${template.label} ${state.rings.length + 1}`,
    };

    updateAndPersist(set, get, {
      rings: [...state.rings, nextRing],
      selectedRingId: nextRing.id,
    });
  },

  deleteRing: (ringId) => {
    const state = get();
    if (state.rings.length <= 1) {
      return;
    }

    const nextRings = state.rings.filter((ring) => ring.id !== ringId);
    updateAndPersist(set, get, {
      rings: nextRings,
      selectedRingId:
        state.selectedRingId === ringId ? nextRings[0]?.id ?? "" : state.selectedRingId,
    });
  },

  applyTrackPreset: (presetId) => {
    const state = get();
    const preset = [...state.userTrackPresets, ...PRESETS].find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const nextRings = state.rings.map((ring) =>
      ring.id === state.selectedRingId ? applyPresetToRing(ring, preset) : ring,
    );
    updateAndPersist(set, get, { rings: nextRings });
  },

  applyGroovePreset: (presetId) => {
    const state = get();
    const groove = [...state.userGrooves, ...GROOVE_PRESETS].find((item) => item.id === presetId);
    if (!groove) {
      return;
    }

    const nextRings = createRingsFromGroove(groove);
    updateAndPersist(set, get, {
      rings: nextRings,
      selectedRingId: nextRings[0]?.id ?? "",
    });
  },

  saveGroovePreset: (name) => {
    const state = get();
    const savedAt = Date.now();
    const nextGroove: GroovePreset = {
      id: `saved-groove-${savedAt}`,
      name,
      category: USER_PRESET_CATEGORY,
      rings: state.rings.slice(0, MAX_TRACKS).map(({ label, division, notes, noteLevels, phaseOffset, voice, volume }) => ({
        label,
        division,
        notes,
        noteLevels,
        phaseOffset,
        voice,
        volume,
      })),
    };
    const nextGrooves = [nextGroove, ...state.userGrooves];
    persistUserPresets(nextGrooves, state.userTrackPresets);
    set({ userGrooves: nextGrooves });
  },

  saveTrackPreset: (name) => {
    const state = get();
    const selectedRing = state.rings.find((ring) => ring.id === state.selectedRingId);
    if (!selectedRing) {
      return;
    }

    const nextPreset: Preset = {
      id: `saved-track-${Date.now()}`,
      name,
      category: USER_PRESET_CATEGORY,
      division: selectedRing.division,
      notes: selectedRing.notes,
      noteLevels: selectedRing.noteLevels,
      phaseOffset: selectedRing.phaseOffset,
    };
    const nextTrackPresets = [nextPreset, ...state.userTrackPresets];
    persistUserPresets(state.userGrooves, nextTrackPresets);
    set({ userTrackPresets: nextTrackPresets });
  },

  deleteGroovePreset: (presetId) => {
    const state = get();
    const nextGrooves = state.userGrooves.filter((preset) => preset.id !== presetId);
    persistUserPresets(nextGrooves, state.userTrackPresets);
    set({ userGrooves: nextGrooves });
  },

  deleteTrackPreset: (presetId) => {
    const state = get();
    const nextTrackPresets = state.userTrackPresets.filter((preset) => preset.id !== presetId);
    persistUserPresets(state.userGrooves, nextTrackPresets);
    set({ userTrackPresets: nextTrackPresets });
  },
}));

export function selectGroovePresets(state: RhythmState): GroovePreset[] {
  return [...state.userGrooves, ...GROOVE_PRESETS];
}

export function selectTrackPresets(state: RhythmState): Preset[] {
  return [...state.userTrackPresets, ...PRESETS];
}
