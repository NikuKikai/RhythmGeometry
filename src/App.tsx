import { useEffect, useRef } from "react";
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
import type { Ring } from "./lib/rhythm";
import { useRhythmStore } from "./store/rhythmStore";
import "./styles/app.css";

const SCHEDULER_INTERVAL_MS = 5;
const SCHEDULER_TOLERANCE = 0.003;

interface PlaybackClock {
  startedAt: number;
  lastAbsolutePosition: number;
  intervalId: number | null;
}

export default function App() {
  const rings = useRhythmStore((state) => state.rings);
  const bpm = useRhythmStore((state) => state.transport.bpm);
  const masterVolume = useRhythmStore((state) => state.transport.masterVolume);
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const cyclePosition = useRhythmStore((state) => state.transport.cyclePosition);
  const hydrate = useRhythmStore((state) => state.hydrate);
  const setCyclePosition = useRhythmStore((state) => state.setCyclePosition);
  const drumKitRef = useRef<DrumKitHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const playbackRef = useRef<PlaybackClock | null>(null);
  const ringsRef = useRef<Ring[]>(rings);
  const bpmRef = useRef(bpm);

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
        const notePosition = ((note + ring.phaseOffset) / ring.division) % 1;
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
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    configureLowLatencyAudio();
    drumKitRef.current = createDrumKit();
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
      const nextCycleDuration = (60 / bpm) * 4;
      playback.startedAt = Tone.immediate() - currentPosition * nextCycleDuration;
      playback.lastAbsolutePosition = currentPosition - SCHEDULER_TOLERANCE;
    }

    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    if (drumKitRef.current) {
      setMasterVolume(drumKitRef.current, masterVolume);
    }
  }, [masterVolume]);

  useEffect(() => {
    if (isPlaying) {
      startRealtimePlayback(cyclePosition);
    } else {
      stopRealtimePlayback();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      return;
    }

    const update = () => {
      const playback = playbackRef.current;
      const cycleDuration = getCycleDuration();
      const elapsed = playback ? Tone.immediate() - playback.startedAt : 0;
      const nextCyclePosition = playback && cycleDuration > 0 ? (elapsed / cycleDuration) % 1 : 0;
      setCyclePosition(nextCyclePosition);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, bpm, setCyclePosition]);

  return (
    <main className="app-shell">
      <div className="workspace">
        <Sidebar />

        <div className="center-stage">
          <RadialSequencer />
        </div>

        <FuturePanel />
      </div>

      <Timeline />
    </main>
  );
}
