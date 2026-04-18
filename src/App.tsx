import { useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone";
import { FuturePanel } from "./components/FuturePanel";
import { RadialSequencer } from "./components/RadialSequencer";
import { Sidebar } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import {
  configureLowLatencyAudio,
  createDrumKit,
  setMasterMuted,
  setMasterVolume,
  triggerDrum,
  type DrumKitHandle,
} from "./lib/audio";
import { DEFAULT_RINGS, GROOVE_PRESETS, PRESETS, RING_TEMPLATES } from "./lib/presets";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingVoice,
  clamp,
  clampBpm,
  toggleNote,
  USER_PRESET_CATEGORY,
  type GroovePreset,
  type Ring,
  type DrumVoice,
  type Preset,
  type TransportState,
} from "./lib/rhythm";
import {
  loadTransportSettings,
  loadUserPresets,
  saveTransportSettings,
  saveUserPresets,
} from "./lib/storage";
import "./styles/app.css";

const INITIAL_TRANSPORT: TransportState = {
  bpm: 112,
  masterVolume: 0.82,
  isPlaying: false,
  cyclePosition: 0,
};

const SCHEDULER_INTERVAL_MS = 5;
const SCHEDULER_TOLERANCE = 0.003;
const MAX_TRACKS = 5;
const TRACK_COLORS = [
  "#ff6b35",
  "#f7c948",
  "#6ee7b7",
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#34d399",
];

interface PlaybackClock {
  startedAt: number;
  lastAbsolutePosition: number;
  intervalId: number | null;
}

export default function App() {
  const [rings, setRings] = useState<Ring[]>(DEFAULT_RINGS);
  const [selectedRingId, setSelectedRingId] = useState(DEFAULT_RINGS[0]?.id ?? "");
  const [transport, setTransport] = useState<TransportState>(INITIAL_TRANSPORT);
  const drumKitRef = useRef<DrumKitHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const playbackRef = useRef<PlaybackClock | null>(null);
  const ringsRef = useRef(rings);
  const bpmRef = useRef(transport.bpm);
  const settingsLoadedRef = useRef(false);
  const [userGrooves, setUserGrooves] = useState<GroovePreset[]>([]);
  const [userTrackPresets, setUserTrackPresets] = useState<Preset[]>([]);

  const coloredRings = useMemo(
    () =>
      rings.map((ring, index) => ({
        ...ring,
        color: TRACK_COLORS[index % TRACK_COLORS.length],
      })),
    [rings],
  );

  const selectedRing = useMemo(
    () => rings.find((ring) => ring.id === selectedRingId) ?? rings[0],
    [rings, selectedRingId],
  );
  const groovePresets = useMemo(() => [...userGrooves, ...GROOVE_PRESETS], [userGrooves]);
  const trackPresets = useMemo(() => [...userTrackPresets, ...PRESETS], [userTrackPresets]);

  function getCycleDuration(): number {
    return (60 / bpmRef.current) * 4;
  }

  function runAudioTick(): void {
    const playback = playbackRef.current;
    const handle = drumKitRef.current;
    if (!playback || !handle) {
      return;
    }

    const cycleDuration = getCycleDuration();
    const now = Tone.immediate();
    const currentAbsolutePosition = (now - playback.startedAt) / cycleDuration;
    const from = playback.lastAbsolutePosition;
    const to = currentAbsolutePosition + SCHEDULER_TOLERANCE;

    ringsRef.current.forEach((ring) => {
      ring.notes.forEach((note) => {
        const notePosition = note / ring.division;
        const firstCycle = Math.floor(from) - 1;
        const lastCycle = Math.floor(to) + 1;

        for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
          const eventPosition = cycle + notePosition;
          if (eventPosition > from && eventPosition <= to) {
            const eventTime = playback.startedAt + eventPosition * cycleDuration;
            triggerDrum(handle.kit, ring.voice, Math.max(eventTime, now), ring.volume);
          }
        }
      });
    });

    playback.lastAbsolutePosition = to;
  }

  function stopRealtimePlayback(): void {
    const playback = playbackRef.current;
    if (playback && playback.intervalId !== null) {
      window.clearInterval(playback.intervalId);
    }
    playbackRef.current = null;

    if (drumKitRef.current) {
      setMasterMuted(drumKitRef.current, true);
    }
  }

  function startRealtimePlayback(startPosition: number): void {
    const handle = drumKitRef.current;
    if (!handle) {
      return;
    }

    stopRealtimePlayback();
    setMasterMuted(handle, false);

    const cycleDuration = getCycleDuration();
    const now = Tone.immediate();
    playbackRef.current = {
      startedAt: now - startPosition * cycleDuration,
      lastAbsolutePosition: startPosition - SCHEDULER_TOLERANCE,
      intervalId: window.setInterval(runAudioTick, SCHEDULER_INTERVAL_MS),
    };

    runAudioTick();
  }

  useEffect(() => {
    configureLowLatencyAudio();
    drumKitRef.current = createDrumKit();
    setMasterVolume(drumKitRef.current, INITIAL_TRANSPORT.masterVolume);
    setMasterMuted(drumKitRef.current, true);
    return () => {
      stopRealtimePlayback();
      drumKitRef.current?.dispose();
      drumKitRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([loadUserPresets(), loadTransportSettings()])
      .then(([storedPresets, storedSettings]) => {
        if (cancelled) {
          return;
        }

        setUserGrooves(storedPresets.grooves);
        setUserTrackPresets(storedPresets.tracks);
        if (storedSettings) {
          setTransport((current) => ({
            ...current,
            bpm: clampBpm(storedSettings.bpm),
            masterVolume: clamp(storedSettings.masterVolume, 0, 1),
          }));
        }
      })
      .catch((error) => {
        console.error("Failed to load stored settings", error);
      })
      .finally(() => {
        if (!cancelled) {
          settingsLoadedRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    ringsRef.current = rings;
  }, [rings]);

  useEffect(() => {
    const playback = playbackRef.current;
    if (playback) {
      const oldCycleDuration = (60 / bpmRef.current) * 4;
      const elapsed = Tone.immediate() - playback.startedAt;
      const currentPosition = oldCycleDuration > 0 ? ((elapsed / oldCycleDuration) % 1 + 1) % 1 : 0;
      const nextCycleDuration = (60 / transport.bpm) * 4;
      playback.startedAt = Tone.immediate() - currentPosition * nextCycleDuration;
      playback.lastAbsolutePosition = currentPosition - SCHEDULER_TOLERANCE;
    }

    bpmRef.current = transport.bpm;
  }, [transport.bpm]);

  useEffect(() => {
    if (drumKitRef.current) {
      setMasterVolume(drumKitRef.current, transport.masterVolume);
    }
  }, [transport.masterVolume]);

  useEffect(() => {
    if (!settingsLoadedRef.current) {
      return;
    }

    saveTransportSettings({
      bpm: transport.bpm,
      masterVolume: transport.masterVolume,
    }).catch((error) => {
      console.error("Failed to save transport settings", error);
    });
  }, [transport.bpm, transport.masterVolume]);

  useEffect(() => {
    if (!transport.isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      return;
    }

    const update = () => {
      const playback = playbackRef.current;
      const cycleDuration = getCycleDuration();
      const elapsed = playback ? Tone.immediate() - playback.startedAt : 0;
      const cyclePosition = playback && cycleDuration > 0 ? (elapsed / cycleDuration) % 1 : 0;
      setTransport((current) => ({
        ...current,
        cyclePosition,
      }));
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [transport.isPlaying, transport.bpm]);

  const handleTogglePlayback = async () => {
    await Tone.start();

    setTransport((current) => {
      const isPlaying = !current.isPlaying;
      if (isPlaying) {
        startRealtimePlayback(current.cyclePosition);
      } else {
        stopRealtimePlayback();
      }

      return {
        ...current,
        isPlaying,
      };
    });
  };

  const handleToggleNote = (ringId: string, noteIndex: number) => {
    setRings((current) =>
      current.map((ring) =>
        ring.id === ringId
          ? { ...ring, notes: toggleNote(ring.notes, noteIndex, ring.division) }
          : ring,
      ),
    );
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = trackPresets.find((item) => item.id === presetId);
    if (!preset || !selectedRing) {
      return;
    }

    setRings((current) =>
      current.map((ring) => (ring.id === selectedRing.id ? applyPresetToRing(ring, preset) : ring)),
    );
  };

  const handleChangeRingDivision = (ringId: string, division: number) => {
    setRings((current) =>
      current.map((ring) => (ring.id === ringId ? changeRingDivision(ring, division) : ring)),
    );
  };

  const handleChangeRingVolume = (ringId: string, volume: number) => {
    setRings((current) =>
      current.map((ring) =>
        ring.id === ringId ? { ...ring, volume: clamp(volume, 0, 1) } : ring,
      ),
    );
  };

  const handleChangeRingVoice = (ringId: string, voice: DrumVoice) => {
    setRings((current) =>
      current.map((ring) => (ring.id === ringId ? changeRingVoice(ring, voice) : ring)),
    );
  };

  const handleApplyGroovePreset = (presetId: string) => {
    const groove = groovePresets.find((item) => item.id === presetId);
    if (!groove) {
      return;
    }

    const createdAt = Date.now();
    const nextRings: Ring[] = groove.rings.slice(0, MAX_TRACKS).map((ring, index) => ({
      ...ring,
      id: `${groove.id}-${index}-${createdAt}`,
      label: `${ring.label} ${index + 1}`,
      color: TRACK_COLORS[index % TRACK_COLORS.length],
    }));

    setRings(nextRings);
    setSelectedRingId(nextRings[0]?.id ?? "");
  };

  const handleSaveGroovePreset = (name: string) => {
    const savedAt = Date.now();
    const nextGroove: GroovePreset = {
      id: `saved-groove-${savedAt}`,
      name,
      category: USER_PRESET_CATEGORY,
      rings: rings.slice(0, MAX_TRACKS).map(({ label, division, notes, voice, volume }) => ({
        label,
        division,
        notes,
        voice,
        volume,
      })),
    };

    setUserGrooves((current) => {
      const next = [nextGroove, ...current];
      saveUserPresets(next, userTrackPresets).catch((error) => {
        console.error("Failed to save groove preset", error);
      });
      return next;
    });
  };

  const handleSaveTrackPreset = (name: string) => {
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

    setUserTrackPresets((current) => {
      const next = [nextPreset, ...current];
      saveUserPresets(userGrooves, next).catch((error) => {
        console.error("Failed to save track preset", error);
      });
      return next;
    });
  };

  const handleDeleteGroovePreset = (presetId: string) => {
    setUserGrooves((current) => {
      const next = current.filter((preset) => preset.id !== presetId);
      saveUserPresets(next, userTrackPresets).catch((error) => {
        console.error("Failed to delete groove preset", error);
      });
      return next;
    });
  };

  const handleDeleteTrackPreset = (presetId: string) => {
    setUserTrackPresets((current) => {
      const next = current.filter((preset) => preset.id !== presetId);
      saveUserPresets(userGrooves, next).catch((error) => {
        console.error("Failed to delete track preset", error);
      });
      return next;
    });
  };

  const handleAddRing = () => {
    setRings((current) => {
      if (current.length >= MAX_TRACKS) {
        return current;
      }

      const template =
        RING_TEMPLATES.find((item) => !current.some((ring) => ring.voice === item.voice)) ??
        RING_TEMPLATES[current.length % RING_TEMPLATES.length];

      const nextRing: Ring = {
        ...template,
        id: `${template.id}-${Date.now()}`,
        label: `${template.label} ${current.length + 1}`,
      };

      setSelectedRingId(nextRing.id);
      return [...current, nextRing];
    });
  };

  const handleDeleteRing = (ringId: string) => {
    setRings((current) => {
      if (current.length <= 1) {
        return current;
      }

      const next = current.filter((ring) => ring.id !== ringId);
      if (selectedRingId === ringId) {
        setSelectedRingId(next[0]?.id ?? "");
      }
      return next;
    });
  };

  return (
    <main className="app-shell">
      <div className="workspace">
        <Sidebar
          bpm={transport.bpm}
          masterVolume={transport.masterVolume}
          grooves={groovePresets}
          presets={trackPresets}
          rings={coloredRings}
          selectedRingId={selectedRingId}
          isPlaying={transport.isPlaying}
          maxTracks={MAX_TRACKS}
          onApplyGroovePreset={handleApplyGroovePreset}
          onApplyPreset={handleApplyPreset}
          onSaveGroovePreset={handleSaveGroovePreset}
          onSaveTrackPreset={handleSaveTrackPreset}
          onDeleteGroovePreset={handleDeleteGroovePreset}
          onDeleteTrackPreset={handleDeleteTrackPreset}
          onChangeBpm={(bpm) =>
            setTransport((current) => ({
              ...current,
              bpm: clampBpm(bpm),
            }))
          }
          onChangeMasterVolume={(volume) =>
            setTransport((current) => ({
              ...current,
              masterVolume: clamp(volume, 0, 1),
            }))
          }
          onChangeRingDivision={handleChangeRingDivision}
          onChangeRingVolume={handleChangeRingVolume}
          onChangeRingVoice={handleChangeRingVoice}
          onAddRing={handleAddRing}
          onDeleteRing={handleDeleteRing}
          onSelectRing={setSelectedRingId}
          onTogglePlayback={handleTogglePlayback}
        />

        <div className="center-stage">
          <RadialSequencer
            rings={coloredRings}
            selectedRingId={selectedRingId}
            cyclePosition={transport.cyclePosition}
            isPlaying={transport.isPlaying}
            onSelectRing={setSelectedRingId}
            onToggleNote={handleToggleNote}
          />
        </div>

        <FuturePanel />
      </div>

      <Timeline cyclePosition={transport.cyclePosition} rings={coloredRings} />
    </main>
  );
}
