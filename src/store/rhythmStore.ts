import { create } from "zustand";
import { DEFAULT_RINGS, GROOVE_PRESETS, PRESETS, RING_TEMPLATES } from "../lib/presets";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingVoice,
  clamp,
  clampBpm,
  toggleNote,
  USER_PRESET_CATEGORY,
  type DrumVoice,
  type GroovePreset,
  type Preset,
  type Ring,
  type TransportState,
} from "../lib/rhythm";
import {
  loadTransportSettings,
  loadUserPresets,
  saveTransportSettings,
  saveUserPresets,
} from "../lib/storage";

export const MAX_TRACKS = 5;
export const TRACK_COLORS = [
  "#ff6b35",
  "#f7c948",
  "#6ee7b7",
  "#60a5fa",
  "#f472b6",
];

const INITIAL_TRANSPORT: TransportState = {
  bpm: 112,
  masterVolume: 0.82,
  isPlaying: false,
  cyclePosition: 0,
};

interface RhythmState {
  rings: Ring[];
  selectedRingId: string;
  transport: TransportState;
  userGrooves: GroovePreset[];
  userTrackPresets: Preset[];
  settingsLoaded: boolean;
  hydrate: () => Promise<void>;
  setCyclePosition: (cyclePosition: number) => void;
  togglePlayback: () => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  selectRing: (ringId: string) => void;
  toggleNote: (ringId: string, noteIndex: number) => void;
  changeRingDivision: (ringId: string, division: number) => void;
  changeRingVolume: (ringId: string, volume: number) => void;
  changeRingVoice: (ringId: string, voice: DrumVoice) => void;
  addRing: () => void;
  deleteRing: (ringId: string) => void;
  applyTrackPreset: (presetId: string) => void;
  applyGroovePreset: (presetId: string) => void;
  saveGroovePreset: (name: string) => void;
  saveTrackPreset: (name: string) => void;
  deleteGroovePreset: (presetId: string) => void;
  deleteTrackPreset: (presetId: string) => void;
}

export function colorRings(rings: Ring[]): Ring[] {
  return rings.map((ring, index) => ({
    ...ring,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
  }));
}

function createRingsFromGroove(groove: GroovePreset): Ring[] {
  const createdAt = Date.now();
  return groove.rings.slice(0, MAX_TRACKS).map((ring, index) => ({
    ...ring,
    id: `${groove.id}-${index}-${createdAt}`,
    label: `${ring.label} ${index + 1}`,
    color: TRACK_COLORS[index % TRACK_COLORS.length],
  }));
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

export const useRhythmStore = create<RhythmState>((set, get) => ({
  rings: DEFAULT_RINGS,
  selectedRingId: DEFAULT_RINGS[0]?.id ?? "",
  transport: INITIAL_TRANSPORT,
  userGrooves: [],
  userTrackPresets: [],
  settingsLoaded: false,

  hydrate: async () => {
    try {
      const [storedPresets, storedSettings] = await Promise.all([
        loadUserPresets(),
        loadTransportSettings(),
      ]);

      set((state) => ({
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
    set((state) => ({
      transport: {
        ...state.transport,
        cyclePosition,
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

  selectRing: (ringId) => set({ selectedRingId: ringId }),

  toggleNote: (ringId, noteIndex) => {
    set((state) => ({
      rings: state.rings.map((ring) =>
        ring.id === ringId
          ? { ...ring, notes: toggleNote(ring.notes, noteIndex, ring.division) }
          : ring,
      ),
    }));
  },

  changeRingDivision: (ringId, division) => {
    set((state) => ({
      rings: state.rings.map((ring) =>
        ring.id === ringId ? changeRingDivision(ring, division) : ring,
      ),
    }));
  },

  changeRingVolume: (ringId, volume) => {
    set((state) => ({
      rings: state.rings.map((ring) =>
        ring.id === ringId ? { ...ring, volume: clamp(volume, 0, 1) } : ring,
      ),
    }));
  },

  changeRingVoice: (ringId, voice) => {
    set((state) => ({
      rings: state.rings.map((ring) =>
        ring.id === ringId ? changeRingVoice(ring, voice) : ring,
      ),
    }));
  },

  addRing: () => {
    set((state) => {
      if (state.rings.length >= MAX_TRACKS) {
        return state;
      }

      const template =
        RING_TEMPLATES.find((item) => !state.rings.some((ring) => ring.voice === item.voice)) ??
        RING_TEMPLATES[state.rings.length % RING_TEMPLATES.length];
      const nextRing: Ring = {
        ...template,
        id: `${template.id}-${Date.now()}`,
        label: `${template.label} ${state.rings.length + 1}`,
      };

      return {
        rings: [...state.rings, nextRing],
        selectedRingId: nextRing.id,
      };
    });
  },

  deleteRing: (ringId) => {
    set((state) => {
      if (state.rings.length <= 1) {
        return state;
      }

      const nextRings = state.rings.filter((ring) => ring.id !== ringId);
      return {
        rings: nextRings,
        selectedRingId:
          state.selectedRingId === ringId ? nextRings[0]?.id ?? "" : state.selectedRingId,
      };
    });
  },

  applyTrackPreset: (presetId) => {
    const state = get();
    const preset = [...state.userTrackPresets, ...PRESETS].find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    set((current) => ({
      rings: current.rings.map((ring) =>
        ring.id === current.selectedRingId ? applyPresetToRing(ring, preset) : ring,
      ),
    }));
  },

  applyGroovePreset: (presetId) => {
    const state = get();
    const groove = [...state.userGrooves, ...GROOVE_PRESETS].find((item) => item.id === presetId);
    if (!groove) {
      return;
    }

    const nextRings = createRingsFromGroove(groove);
    set({
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
      rings: state.rings.slice(0, MAX_TRACKS).map(({ label, division, notes, voice, volume }) => ({
        label,
        division,
        notes,
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
