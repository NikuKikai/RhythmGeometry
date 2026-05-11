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
import { getNoteLevel, getPlaybackNoteLevel, type Section } from "../lib/rhythm";
import { useRhythmStore } from "../store/rhythmStore";

const SCHEDULER_INTERVAL_MS = 5;
const SCHEDULER_TOLERANCE = 0.003;

interface PlaybackClock {
  startedAt: number;
  lastAbsolutePosition: number;
  intervalId: number | null;
}

function getEnabledSections(sections: Section[]): Section[] {
  return sections.filter((section) => section.isEnabled);
}

export function useDrumPlaybackEngine(): void {
  const engineRef = useRef<DrumEngine | null>(null);
  const playbackRef = useRef<PlaybackClock | null>(null);
  const rafRef = useRef<number | null>(null);
  const sectionsRef = useRef<Section[]>(useRhythmStore.getState().sections);
  const bpmRef = useRef(useRhythmStore.getState().transport.bpm);
  const arrangementPositionRef = useRef(useRhythmStore.getState().transport.arrangementPosition);

  const getCycleDuration = useCallback((): number => {
    return (60 / bpmRef.current) * 4;
  }, []);

  const getPlaybackCursor = useCallback((now: number) => {
    const playback = playbackRef.current;
    const enabledSections = getEnabledSections(sectionsRef.current);
    if (!playback || enabledSections.length === 0) {
      return {
        arrangementPosition: 0,
        cyclePosition: 0,
        playbackSectionId: "",
      };
    }

    const cycleDuration = getCycleDuration();
    const arrangementLength = enabledSections.length;
    const elapsedCycles = cycleDuration > 0 ? (now - playback.startedAt) / cycleDuration : 0;
    const normalizedAbsolutePosition =
      ((elapsedCycles % arrangementLength) + arrangementLength) % arrangementLength;
    const playbackSectionIndex = Math.floor(normalizedAbsolutePosition) % arrangementLength;
    const cyclePosition = normalizedAbsolutePosition - playbackSectionIndex;

    return {
      arrangementPosition: normalizedAbsolutePosition / arrangementLength,
      cyclePosition,
      playbackSectionId: enabledSections[playbackSectionIndex]?.id ?? "",
    };
  }, [getCycleDuration]);

  const stopCyclePositionUpdates = useCallback((): void => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runAudioTick = useCallback((): void => {
    const playback = playbackRef.current;
    const engine = engineRef.current;
    const enabledSections = getEnabledSections(sectionsRef.current);
    if (!playback || !engine || enabledSections.length === 0) {
      return;
    }

    const cycleDuration = getCycleDuration();
    const arrangementLength = enabledSections.length;
    const now = Tone.immediate();
    const currentAbsolutePosition = (now - playback.startedAt) / cycleDuration;
    const from = playback.lastAbsolutePosition;
    const to = currentAbsolutePosition + SCHEDULER_TOLERANCE;

    enabledSections.forEach((section, sectionIndex) => {
      section.rings.forEach((ring) => {
        ring.notes.forEach((note) => {
          const notePosition = ((note + ring.phaseOffset) / ring.division) % 1;
          const firstLoop = Math.floor(from / arrangementLength) - 1;
          const lastLoop = Math.floor(to / arrangementLength) + 1;

          for (let loop = firstLoop; loop <= lastLoop; loop += 1) {
            const eventPosition = loop * arrangementLength + sectionIndex + notePosition;
            if (eventPosition > from && eventPosition <= to) {
              const eventTime = playback.startedAt + eventPosition * cycleDuration;
              triggerDrum(
                engine.kit,
                ring.voice,
                Math.max(eventTime, now),
                ring.volume * getPlaybackNoteLevel(getNoteLevel(ring.noteLevels, note)),
              );
            }
          }
        });
      });
    });

    playback.lastAbsolutePosition = to;
  }, [getCycleDuration]);

  const startCyclePositionUpdates = useCallback((): void => {
    stopCyclePositionUpdates();

    const update = () => {
      const now = Tone.immediate();
      const { arrangementPosition, cyclePosition, playbackSectionId } = getPlaybackCursor(now);
      useRhythmStore.getState().setCyclePosition(cyclePosition, arrangementPosition, playbackSectionId);
      rafRef.current = window.requestAnimationFrame(update);
    };

    rafRef.current = window.requestAnimationFrame(update);
  }, [getPlaybackCursor, stopCyclePositionUpdates]);

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

  const startRealtimePlayback = useCallback((startArrangementPosition: number): void => {
    const engine = engineRef.current;
    const enabledSections = getEnabledSections(sectionsRef.current);
    if (!engine || enabledSections.length === 0) {
      return;
    }

    stopRealtimePlayback();
    setMasterMuted(engine, false);

    const cycleDuration = getCycleDuration();
    const arrangementLength = enabledSections.length;
    const now = Tone.immediate();
    const normalizedArrangementPosition =
      ((startArrangementPosition % 1) + 1) % 1;
    const startAbsolutePosition = normalizedArrangementPosition * arrangementLength;

    playbackRef.current = {
      startedAt: now - startAbsolutePosition * cycleDuration,
      lastAbsolutePosition: startAbsolutePosition - SCHEDULER_TOLERANCE,
      intervalId: window.setInterval(runAudioTick, SCHEDULER_INTERVAL_MS),
    };

    runAudioTick();
    startCyclePositionUpdates();
  }, [getCycleDuration, runAudioTick, startCyclePositionUpdates, stopRealtimePlayback]);

  const handleBpmChange = useCallback((nextBpm: number): void => {
    const playback = playbackRef.current;
    if (playback) {
      const oldCycleDuration = (60 / bpmRef.current) * 4;
      const enabledSections = getEnabledSections(sectionsRef.current);
      const arrangementLength = Math.max(1, enabledSections.length);
      const elapsed = Tone.immediate() - playback.startedAt;
      const currentAbsolutePosition = oldCycleDuration > 0 ? elapsed / oldCycleDuration : 0;
      const normalizedArrangementPosition =
        (((currentAbsolutePosition % arrangementLength) + arrangementLength) % arrangementLength) /
        arrangementLength;
      const nextCycleDuration = (60 / nextBpm) * 4;

      playback.startedAt =
        Tone.immediate() - normalizedArrangementPosition * arrangementLength * nextCycleDuration;
      playback.lastAbsolutePosition =
        normalizedArrangementPosition * arrangementLength - SCHEDULER_TOLERANCE;
    }

    bpmRef.current = nextBpm;
  }, []);

  useEffect(() => {
    const state = useRhythmStore.getState();

    configureLowLatencyAudio();
    engineRef.current = createDrumEngine();
    setMasterMuted(engineRef.current, true);
    setMasterVolume(engineRef.current, state.transport.masterVolume);

    sectionsRef.current = state.sections;
    bpmRef.current = state.transport.bpm;
    arrangementPositionRef.current = state.transport.arrangementPosition;

    if (state.transport.isPlaying) {
      startRealtimePlayback(arrangementPositionRef.current);
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
        if (state.sections !== previousState.sections) {
          sectionsRef.current = state.sections;
        }

        if (state.transport.arrangementPosition !== previousState.transport.arrangementPosition) {
          arrangementPositionRef.current = state.transport.arrangementPosition;
        }

        if (state.transport.bpm !== previousState.transport.bpm) {
          handleBpmChange(state.transport.bpm);
        }

        if (state.transport.masterVolume !== previousState.transport.masterVolume && engineRef.current) {
          setMasterVolume(engineRef.current, state.transport.masterVolume);
        }

        if (state.transport.isPlaying !== previousState.transport.isPlaying) {
          if (state.transport.isPlaying) {
            startRealtimePlayback(arrangementPositionRef.current);
          } else {
            stopRealtimePlayback();
          }
        }
      }),
    [handleBpmChange, startRealtimePlayback, stopRealtimePlayback],
  );
}
