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
  type Section,
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

function createSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRingId(sectionId: string, ringIndex: number): string {
  return `${sectionId}-ring-${ringIndex}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeStoredRing(ring: Ring): Ring {
  const ringWithDivision = changeRingDivision(ring, ring.division);
  return {
    ...ringWithDivision,
    phaseOffset: clamp(ring.phaseOffset ?? 0, 0, 1),
    volume: clamp(ring.volume, 0, 1),
  };
}

function normalizeSectionRings(rings: Ring[], sectionId: string): Ring[] {
  return rings.slice(0, MAX_TRACKS).map((ring, index) => ({
    ...normalizeStoredRing(ring),
    id: createRingId(sectionId, index),
  }));
}

function cloneSection(section: Section): Section {
  const sectionId = createSectionId();
  return {
    id: sectionId,
    isEnabled: section.isEnabled,
    rings: normalizeSectionRings(section.rings, sectionId),
  };
}

function createInitialSections(): Section[] {
  const sectionId = createSectionId();
  return [
    {
      id: sectionId,
      isEnabled: true,
      rings: normalizeSectionRings(DEFAULT_RINGS, sectionId),
    },
  ];
}

function getSelectedRingIndex(rings: Ring[], selectedRingId: string): number {
  const selectedRingIndex = rings.findIndex((ring) => ring.id === selectedRingId);
  return selectedRingIndex >= 0 ? selectedRingIndex : 0;
}

function resolveSelectedRingId(
  rings: Ring[],
  previousSelectedRingId: string,
  preferredRingIndex: number,
): string {
  if (rings.some((ring) => ring.id === previousSelectedRingId)) {
    return previousSelectedRingId;
  }
  return rings[Math.min(preferredRingIndex, Math.max(0, rings.length - 1))]?.id ?? "";
}

function getCurrentSection(sections: Section[], currentSectionId: string): Section | undefined {
  return sections.find((section) => section.id === currentSectionId) ?? sections[0];
}

function syncCurrentSectionState(
  sections: Section[],
  currentSectionId: string,
  selectedRingId: string,
  preferredRingIndex = 0,
): Pick<RhythmState, "sections" | "currentSectionId" | "rings" | "selectedRingId"> {
  const currentSection = getCurrentSection(sections, currentSectionId);
  const rings = currentSection?.rings ?? [];
  return {
    sections,
    currentSectionId: currentSection?.id ?? "",
    rings,
    selectedRingId: resolveSelectedRingId(rings, selectedRingId, preferredRingIndex),
  };
}

function normalizeGrooveSections(groove: GroovePreset): Section[] {
  const rawSections =
    "sections" in groove && Array.isArray(groove.sections) && groove.sections.length > 0
      ? groove.sections
      : "rings" in (groove as GroovePreset & { rings?: Ring[] }) &&
          Array.isArray((groove as GroovePreset & { rings?: Ring[] }).rings)
        ? [{ isEnabled: true, rings: (groove as GroovePreset & { rings: Ring[] }).rings }]
        : [];

  return rawSections.map((section) => {
    const sectionId = createSectionId();
    return {
      id: sectionId,
      isEnabled: section.isEnabled ?? true,
      rings: normalizeSectionRings(section.rings as Ring[], sectionId),
    };
  });
}

function normalizeStoredGroove(groove: GroovePreset): GroovePreset {
  if ("sections" in groove && Array.isArray(groove.sections)) {
    return groove;
  }

  const legacyRings = (groove as GroovePreset & { rings?: Array<Omit<Ring, "id">> }).rings ?? [];
  return {
    id: groove.id,
    name: groove.name,
    category: groove.category,
    sections: [
      {
        isEnabled: true,
        rings: legacyRings.map((ring) => ({
          ...ring,
          phaseOffset: ring.phaseOffset ?? 0,
        })),
      },
    ],
  };
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

const INITIAL_SECTIONS = createInitialSections();

const INITIAL_TRANSPORT: TransportState = {
  bpm: 112,
  masterVolume: 0.82,
  isPlaying: false,
  cyclePosition: 0,
  arrangementPosition: 0,
  playbackSectionId: INITIAL_SECTIONS[0]?.id ?? "",
  cycleBuckets: createCycleBuckets(),
  autoFollowSection: true,
};

interface RhythmState {
  sections: Section[];
  currentSectionId: string;
  rings: Ring[];
  selectedRingId: string;
  transport: TransportState;
  presetPanel: StoredPresetPanelState;
  userGrooves: GroovePreset[];
  userTrackPresets: Preset[];
  settingsLoaded: boolean;
  hydrate: () => Promise<void>;
  setCyclePosition: (cyclePosition: number, arrangementPosition: number, playbackSectionId: string) => void;
  togglePlayback: () => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  setAutoFollowSection: (enabled: boolean) => void;
  setPresetPanelState: (panelState: Partial<StoredPresetPanelState>) => void;
  selectSection: (sectionId: string) => void;
  addSection: () => void;
  toggleSectionEnabled: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
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

function persistAppState(state: RhythmState): void {
  if (!state.settingsLoaded) {
    return;
  }

  saveAppState({
    sections: state.sections,
    currentSectionId: state.currentSectionId,
    selectedRingId: state.selectedRingId,
    presetPanel: state.presetPanel,
    showCentroidArrow: useSequencerUiStore.getState().showCentroidArrow,
    showLbdmGrouping: useSequencerUiStore.getState().showLbdmGrouping,
    autoFollowSection: state.transport.autoFollowSection,
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
  partial: Partial<Pick<RhythmState, "sections" | "currentSectionId" | "rings" | "selectedRingId" | "presetPanel" | "transport">>,
): void {
  set(partial);
  persistAppState(get());
}

function mapCurrentSectionRings(
  state: RhythmState,
  transform: (ring: Ring, ringIndex: number) => Ring,
): Pick<RhythmState, "sections" | "rings" | "selectedRingId" | "currentSectionId"> {
  const nextSections = state.sections.map((section) =>
    section.id === state.currentSectionId
      ? {
          ...section,
          rings: section.rings.map(transform),
        }
      : section,
  );
  return syncCurrentSectionState(nextSections, state.currentSectionId, state.selectedRingId);
}

export const useRhythmStore = create<RhythmState>((set, get) => ({
  sections: INITIAL_SECTIONS,
  currentSectionId: INITIAL_SECTIONS[0]?.id ?? "",
  rings: INITIAL_SECTIONS[0]?.rings ?? [],
  selectedRingId: INITIAL_SECTIONS[0]?.rings[0]?.id ?? "",
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

      const storedSections =
        storedAppState?.sections?.length
          ? storedAppState.sections.map((section) => {
              const sectionId = section.id || createSectionId();
              return {
                id: sectionId,
                isEnabled: section.isEnabled ?? true,
                rings: normalizeSectionRings(section.rings, sectionId),
              };
            })
          : storedAppState?.rings?.length
            ? (() => {
                const sectionId = createSectionId();
                return [{
                  id: sectionId,
                  isEnabled: true,
                  rings: normalizeSectionRings(storedAppState.rings, sectionId),
                }];
              })()
            : undefined;

      useSequencerUiStore.getState().setShowCentroidArrow(storedAppState?.showCentroidArrow ?? false);
      useSequencerUiStore.getState().setShowLbdmGrouping(storedAppState?.showLbdmGrouping ?? false);

      set((state) => {
        const nextSections = storedSections ?? state.sections;
        const nextCurrentSectionId =
          nextSections.some((section) => section.id === storedAppState?.currentSectionId)
            ? storedAppState?.currentSectionId ?? nextSections[0]?.id ?? state.currentSectionId
            : nextSections[0]?.id ?? state.currentSectionId;
        const synced = syncCurrentSectionState(
          nextSections,
          nextCurrentSectionId,
          storedAppState?.selectedRingId ?? state.selectedRingId,
          getSelectedRingIndex(state.rings, storedAppState?.selectedRingId ?? state.selectedRingId),
        );

        return {
          ...synced,
          presetPanel: storedAppState?.presetPanel ?? state.presetPanel,
          userGrooves: storedPresets.grooves.map(normalizeStoredGroove),
          userTrackPresets: storedPresets.tracks,
          transport: {
            ...state.transport,
            bpm: clampBpm(storedSettings?.bpm ?? state.transport.bpm),
            masterVolume: clamp(storedSettings?.masterVolume ?? state.transport.masterVolume, 0, 1),
            playbackSectionId: synced.currentSectionId,
            autoFollowSection: storedAppState?.autoFollowSection ?? state.transport.autoFollowSection,
          },
          settingsLoaded: true,
        };
      });
    } catch (error) {
      console.error("Failed to load stored settings", error);
      set({ settingsLoaded: true });
    }
  },

  setCyclePosition: (cyclePosition, arrangementPosition, playbackSectionId) => {
    const nextActiveBucket = getCycleBucketIndex(cyclePosition);
    set((state) => {
      const nextTransport = {
        ...state.transport,
        cyclePosition,
        arrangementPosition,
        playbackSectionId,
        cycleBuckets: (() => {
          const nextBuckets = createCycleBuckets();
          nextBuckets[nextActiveBucket] = cyclePosition;
          return nextBuckets;
        })(),
      };

      const isDraggingRing = useSequencerUiStore.getState().ringDragState?.isRotating ?? false;
      if (
        !state.transport.autoFollowSection ||
        state.currentSectionId === playbackSectionId ||
        isDraggingRing
      ) {
        return { transport: nextTransport };
      }

      const synced = syncCurrentSectionState(
        state.sections,
        playbackSectionId,
        state.selectedRingId,
        getSelectedRingIndex(state.rings, state.selectedRingId),
      );
      return {
        ...synced,
        transport: nextTransport,
      };
    });
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

  setAutoFollowSection: (enabled) => {
    updateAndPersist(set, get, {
      transport: {
        ...get().transport,
        autoFollowSection: enabled,
      },
    });
  },

  setPresetPanelState: (panelState) => {
    updateAndPersist(set, get, {
      presetPanel: {
        ...get().presetPanel,
        ...panelState,
      },
    });
  },

  selectSection: (sectionId) => {
    const state = get();
    const synced = syncCurrentSectionState(
      state.sections,
      sectionId,
      state.selectedRingId,
      getSelectedRingIndex(state.rings, state.selectedRingId),
    );
    updateAndPersist(set, get, synced);
  },

  addSection: () => {
    const state = get();
    const currentSection = getCurrentSection(state.sections, state.currentSectionId);
    const nextSection = currentSection ? cloneSection(currentSection) : createInitialSections()[0];
    const nextSections = [...state.sections, nextSection];
    const synced = syncCurrentSectionState(
      nextSections,
      nextSection.id,
      state.selectedRingId,
      getSelectedRingIndex(state.rings, state.selectedRingId),
    );
    updateAndPersist(set, get, synced);
  },

  toggleSectionEnabled: (sectionId) => {
    const state = get();
    const nextSections = state.sections.map((section) =>
      section.id === sectionId ? { ...section, isEnabled: !section.isEnabled } : section,
    );
    updateAndPersist(set, get, { sections: nextSections });
  },

  deleteSection: (sectionId) => {
    const state = get();
    if (state.sections.length <= 1) {
      return;
    }

    const sectionIndex = state.sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) {
      return;
    }

    const nextSections = state.sections.filter((section) => section.id !== sectionId);
    const fallbackSectionId =
      nextSections[Math.min(sectionIndex, nextSections.length - 1)]?.id ?? nextSections[0]?.id ?? "";
    const synced = syncCurrentSectionState(
      nextSections,
      state.currentSectionId === sectionId ? fallbackSectionId : state.currentSectionId,
      state.selectedRingId,
      getSelectedRingIndex(state.rings, state.selectedRingId),
    );

    updateAndPersist(set, get, {
      ...synced,
      transport: {
        ...state.transport,
        playbackSectionId:
          state.transport.playbackSectionId === sectionId
            ? fallbackSectionId
            : state.transport.playbackSectionId,
      },
    });
  },

  selectRing: (ringId) => {
    if (get().selectedRingId === ringId) {
      return;
    }
    updateAndPersist(set, get, { selectedRingId: ringId });
  },

  toggleNote: (ringId, noteIndex) => {
    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId
        ? {
            ...ring,
            notes: toggleNote(ring.notes, noteIndex, ring.division),
            noteLevels: toggleNoteLevel(ring.noteLevels, ring.notes, noteIndex, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  setNoteLevel: (ringId, noteIndex, level) => {
    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId
        ? {
            ...ring,
            noteLevels: setNoteLevel(ring.noteLevels, ring.notes, noteIndex, level, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  changeRingDivision: (ringId, division) => {
    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId ? changeRingDivision(ring, division) : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  changeRingPhaseOffset: (ringId, phaseOffset) => {
    const state = get();
    const ringIndex = state.rings.findIndex((ring) => ring.id === ringId);
    if (ringIndex < 0) {
      return;
    }

    const nextSections = state.sections.map((section) => ({
      ...section,
      rings: section.rings.map((ring, index) =>
        index === ringIndex ? changeRingPhaseOffset(ring, phaseOffset) : ring,
      ),
    }));
    const synced = syncCurrentSectionState(
      nextSections,
      state.currentSectionId,
      state.selectedRingId,
      ringIndex,
    );
    updateAndPersist(set, get, synced);
  },

  changeRingVolume: (ringId, volume) => {
    const nextVolume = clamp(volume, 0, 1);
    const targetRing = get().rings.find((ring) => ring.id === ringId);
    if (!targetRing || targetRing.volume === nextVolume) {
      return;
    }

    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId ? { ...ring, volume: nextVolume } : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  changeRingVoice: (ringId, voice) => {
    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId ? changeRingVoice(ring, voice) : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  replaceRingNotes: (ringId, notes) => {
    const nextState = mapCurrentSectionRings(get(), (ring) =>
      ring.id === ringId
        ? {
            ...ring,
            notes,
            noteLevels: normalizeNoteLevels(ring.noteLevels, notes, ring.division),
          }
        : ring,
    );
    updateAndPersist(set, get, nextState);
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
    const nextRingIndex = state.rings.length;
    const nextLabel = `${template.label} ${nextRingIndex + 1}`;
    const nextSections = state.sections.map((section) => ({
      ...section,
      rings: [
        ...section.rings,
        {
          ...template,
          id: createRingId(section.id, nextRingIndex),
          label: nextLabel,
        },
      ],
    }));
    const synced = syncCurrentSectionState(nextSections, state.currentSectionId, state.selectedRingId, nextRingIndex);
    updateAndPersist(set, get, {
      ...synced,
      selectedRingId: synced.rings[nextRingIndex]?.id ?? synced.selectedRingId,
    });
  },

  deleteRing: (ringId) => {
    const state = get();
    if (state.rings.length <= 1) {
      return;
    }

    const ringIndex = state.rings.findIndex((ring) => ring.id === ringId);
    if (ringIndex < 0) {
      return;
    }

    const nextSections = state.sections.map((section) => ({
      ...section,
      rings: section.rings.filter((_, index) => index !== ringIndex),
    }));
    const synced = syncCurrentSectionState(
      nextSections,
      state.currentSectionId,
      state.selectedRingId,
      Math.max(0, ringIndex - 1),
    );
    updateAndPersist(set, get, synced);
  },

  applyTrackPreset: (presetId) => {
    const state = get();
    const preset = [...state.userTrackPresets, ...PRESETS].find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const nextState = mapCurrentSectionRings(state, (ring) =>
      ring.id === state.selectedRingId ? applyPresetToRing(ring, preset) : ring,
    );
    updateAndPersist(set, get, nextState);
  },

  applyGroovePreset: (presetId) => {
    const state = get();
    const groove = [...state.userGrooves, ...GROOVE_PRESETS].find((item) => item.id === presetId);
    if (!groove) {
      return;
    }

    const nextSections = normalizeGrooveSections(groove);
    const synced = syncCurrentSectionState(nextSections, nextSections[0]?.id ?? "", state.selectedRingId, 0);
    updateAndPersist(set, get, {
      ...synced,
      transport: {
        ...state.transport,
        cyclePosition: 0,
        arrangementPosition: 0,
        playbackSectionId: synced.currentSectionId,
      },
    });
  },

  saveGroovePreset: (name) => {
    const state = get();
    const savedAt = Date.now();
    const nextGroove: GroovePreset = {
      id: `saved-groove-${savedAt}`,
      name,
      category: USER_PRESET_CATEGORY,
      sections: state.sections.map((section) => ({
        isEnabled: section.isEnabled,
        rings: section.rings.slice(0, MAX_TRACKS).map(
          ({ label, division, notes, noteLevels, phaseOffset, voice, volume }) => ({
            label,
            division,
            notes,
            noteLevels,
            phaseOffset,
            voice,
            volume,
          }),
        ),
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
