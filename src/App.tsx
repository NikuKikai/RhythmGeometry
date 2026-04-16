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
import { DEFAULT_RINGS, PRESETS, RING_TEMPLATES } from "./lib/presets";
import {
  applyPresetToRing,
  changeRingDivision,
  changeRingVoice,
  clamp,
  clampBpm,
  toggleNote,
  type Ring,
  type DrumVoice,
  type TransportState,
} from "./lib/rhythm";
import "./styles/app.css";

const INITIAL_TRANSPORT: TransportState = {
  bpm: 112,
  masterVolume: 0.82,
  isPlaying: false,
  cyclePosition: 0,
};

const SCHEDULER_INTERVAL_MS = 5;
const SCHEDULER_TOLERANCE = 0.003;

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

  const selectedRing = useMemo(
    () => rings.find((ring) => ring.id === selectedRingId) ?? rings[0],
    [rings, selectedRingId],
  );

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
    const preset = PRESETS.find((item) => item.id === presetId);
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

  const handleAddRing = () => {
    setRings((current) => {
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
          presets={PRESETS}
          rings={rings}
          selectedRingId={selectedRingId}
          isPlaying={transport.isPlaying}
          onApplyPreset={handleApplyPreset}
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
            rings={rings}
            selectedRingId={selectedRingId}
            cyclePosition={transport.cyclePosition}
            isPlaying={transport.isPlaying}
            onSelectRing={setSelectedRingId}
            onToggleNote={handleToggleNote}
          />
        </div>

        <FuturePanel />
      </div>

      <Timeline cyclePosition={transport.cyclePosition} rings={rings} />
    </main>
  );
}
