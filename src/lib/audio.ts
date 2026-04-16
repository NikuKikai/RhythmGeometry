import * as Tone from "tone";
import type { DrumVoice } from "./rhythm";

interface DrumKit {
  kick: Tone.MembraneSynth;
  snareNoise: Tone.NoiseSynth;
  snareBody: Tone.MembraneSynth;
  closedHat: Tone.NoiseSynth;
  openHat: Tone.NoiseSynth;
  tom: Tone.MembraneSynth;
}

export type DrumKitHandle = ReturnType<typeof createDrumKit>;

const MIN_TRIGGER_GAP_SECONDS = 0.0005;
const SCHEDULE_AHEAD_SECONDS = 0.001;
const lastTriggerTimes = new WeakMap<DrumKit, Partial<Record<DrumVoice, number>>>();

export function configureLowLatencyAudio(): void {
  const context = Tone.getContext();
  context.lookAhead = 0;
  (context as Tone.Context).updateInterval = 0.005;
}

export function createDrumKit() {
  const master = new Tone.Volume(-8).toDestination();
  const kit: DrumKit = {
    kick: new Tone.MembraneSynth({
      pitchDecay: 0.035,
      octaves: 8,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0.01, release: 0.08 },
    }).connect(master),
    snareNoise: new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.11, sustain: 0, release: 0.035 },
    }).connect(master),
    snareBody: new Tone.MembraneSynth({
      pitchDecay: 0.012,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 },
    }).connect(master),
    closedHat: new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
    }).connect(master),
    openHat: new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.12 },
    }).connect(master),
    tom: new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.18, sustain: 0.01, release: 0.1 },
    }).connect(master),
  };
  lastTriggerTimes.set(kit, {});

  return {
    master,
    kit,
    dispose() {
      Object.values(kit).forEach((synth) => synth.dispose());
      master.dispose();
    },
  };
}

export function setMasterVolume(handle: DrumKitHandle, volume: number): void {
  handle.master.volume.value = volume <= 0 ? -Infinity : Tone.gainToDb(volume);
}

export function setMasterMuted(handle: DrumKitHandle, muted: boolean): void {
  handle.master.mute = muted;
}

function getMonotonicTriggerTime(kit: DrumKit, voice: DrumVoice, time: Tone.Unit.Time): number {
  const requestedTime = typeof time === "number" ? time : Tone.Time(time).toSeconds();
  const voiceTimes = lastTriggerTimes.get(kit) ?? {};
  const earliestRuntime = Tone.immediate() + SCHEDULE_AHEAD_SECONDS;
  const earliestVoiceTime = (voiceTimes[voice] ?? -Infinity) + MIN_TRIGGER_GAP_SECONDS;
  const safeTime = Math.max(requestedTime, earliestRuntime, earliestVoiceTime);

  voiceTimes[voice] = safeTime;
  lastTriggerTimes.set(kit, voiceTimes);
  return safeTime;
}

export function triggerDrum(
  kit: DrumKit,
  voice: DrumVoice,
  time: Tone.Unit.Time,
  velocity: number,
): void {
  const safeVelocity = Math.min(Math.max(velocity, 0), 1);
  const safeTime = getMonotonicTriggerTime(kit, voice, time);

  switch (voice) {
    case "kick":
      kit.kick.triggerAttackRelease("C1", "8n", safeTime, safeVelocity);
      break;
    case "snare":
      kit.snareBody.triggerAttackRelease("D2", "32n", safeTime, safeVelocity * 0.45);
      kit.snareNoise.triggerAttackRelease("16n", safeTime, safeVelocity);
      break;
    case "closedHat":
      kit.closedHat.triggerAttackRelease("32n", safeTime, safeVelocity);
      break;
    case "openHat":
      kit.openHat.triggerAttackRelease("8n", safeTime, safeVelocity);
      break;
    case "tom":
      kit.tom.triggerAttackRelease("G1", "8n", safeTime, safeVelocity);
      break;
  }
}
