import { useCallback, useEffect, useRef } from "react";
import * as Tone from "tone";
import {
  configureLowLatencyAudio,
  createDrumEngine,
  setMasterMuted,
  setMasterVolume,
  triggerDrum,
  type DrumEngine,
} from "../lib/audio";
import type { Ring } from "../lib/rhythm";
import { useRhythmStore } from "../store/rhythmStore";

const SCHEDULER_INTERVAL_MS = 5;
const SCHEDULER_TOLERANCE = 0.003;

interface PlaybackClock {
  startedAt: number;
  lastAbsolutePosition: number;
  intervalId: number | null;
}

export function useDrumPlaybackEngine(): void {
  const engineRef = useRef<DrumEngine | null>(null);
  const playbackRef = useRef<PlaybackClock | null>(null);
  const rafRef = useRef<number | null>(null);
  const ringsRef = useRef<Ring[]>(useRhythmStore.getState().rings);
  const bpmRef = useRef(useRhythmStore.getState().transport.bpm);
  const cyclePositionRef = useRef(useRhythmStore.getState().transport.cyclePosition);

  const getCycleDuration = useCallback((): number => {
    return (60 / bpmRef.current) * 4;
  }, []);

  const stopCyclePositionUpdates = useCallback((): void => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runAudioTick = useCallback((): void => {
    const playback = playbackRef.current;
    const engine = engineRef.current;
    if (!playback || !engine) {
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
            triggerDrum(engine.kit, ring.voice, Math.max(eventTime, now), ring.volume);
          }
        }
      });
    });

    playback.lastAbsolutePosition = to;
  }, [getCycleDuration]);

  const startCyclePositionUpdates = useCallback((): void => {
    stopCyclePositionUpdates();

    const update = () => {
      const playback = playbackRef.current;
      const cycleDuration = getCycleDuration();
      const elapsed = playback ? Tone.immediate() - playback.startedAt : 0;
      const nextCyclePosition = playback && cycleDuration > 0 ? (elapsed / cycleDuration) % 1 : 0;

      useRhythmStore.getState().setCyclePosition(nextCyclePosition);
      rafRef.current = window.requestAnimationFrame(update);
    };

    rafRef.current = window.requestAnimationFrame(update);
  }, [getCycleDuration, stopCyclePositionUpdates]);

  const stopRealtimePlayback = useCallback((): void => {
    const playback = playbackRef.current;
    if (playback && playback.intervalId !== null) {
      window.clearInterval(playback.intervalId);
    }
    playbackRef.current = null;
    stopCyclePositionUpdates();

    if (engineRef.current) {
      setMasterMuted(engineRef.current, true);
    }
  }, [stopCyclePositionUpdates]);

  const startRealtimePlayback = useCallback((startPosition: number): void => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    stopRealtimePlayback();
    setMasterMuted(engine, false);

    const cycleDuration = getCycleDuration();
    const now = Tone.immediate();
    playbackRef.current = {
      startedAt: now - startPosition * cycleDuration,
      lastAbsolutePosition: startPosition - SCHEDULER_TOLERANCE,
      intervalId: window.setInterval(runAudioTick, SCHEDULER_INTERVAL_MS),
    };

    runAudioTick();
    startCyclePositionUpdates();
  }, [getCycleDuration, runAudioTick, startCyclePositionUpdates, stopRealtimePlayback]);

  const handleBpmChange = useCallback((nextBpm: number): void => {
    const playback = playbackRef.current;
    if (playback) {
      const oldCycleDuration = (60 / bpmRef.current) * 4;
      const elapsed = Tone.immediate() - playback.startedAt;
      const currentPosition = oldCycleDuration > 0 ? ((elapsed / oldCycleDuration) % 1 + 1) % 1 : 0;
      const nextCycleDuration = (60 / nextBpm) * 4;

      playback.startedAt = Tone.immediate() - currentPosition * nextCycleDuration;
      playback.lastAbsolutePosition = currentPosition - SCHEDULER_TOLERANCE;
    }

    bpmRef.current = nextBpm;
  }, []);

  useEffect(() => {
    const state = useRhythmStore.getState();

    configureLowLatencyAudio();
    engineRef.current = createDrumEngine();
    setMasterMuted(engineRef.current, true);
    setMasterVolume(engineRef.current, state.transport.masterVolume);

    ringsRef.current = state.rings;
    bpmRef.current = state.transport.bpm;
    cyclePositionRef.current = state.transport.cyclePosition;

    if (state.transport.isPlaying) {
      startRealtimePlayback(cyclePositionRef.current);
    }

    return () => {
      stopRealtimePlayback();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [startRealtimePlayback, stopRealtimePlayback]);

  useEffect(
    () =>
      useRhythmStore.subscribe((state, previousState) => {
        if (state.rings !== previousState.rings) {
          ringsRef.current = state.rings;
        }

        if (state.transport.cyclePosition !== previousState.transport.cyclePosition) {
          cyclePositionRef.current = state.transport.cyclePosition;
        }

        if (state.transport.bpm !== previousState.transport.bpm) {
          handleBpmChange(state.transport.bpm);
        }

        if (state.transport.masterVolume !== previousState.transport.masterVolume && engineRef.current) {
          setMasterVolume(engineRef.current, state.transport.masterVolume);
        }

        if (state.transport.isPlaying !== previousState.transport.isPlaying) {
          if (state.transport.isPlaying) {
            startRealtimePlayback(cyclePositionRef.current);
          } else {
            stopRealtimePlayback();
          }
        }
      }),
    [handleBpmChange, startRealtimePlayback, stopRealtimePlayback],
  );
}
