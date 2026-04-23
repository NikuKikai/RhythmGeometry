import * as Tone from "tone";
import type { DrumVoice } from "./rhythm";

interface DrumKit {
  kick: Tone.MembraneSynth;
  kickTransient: Tone.MembraneSynth;
  snareNoise: Tone.NoiseSynth;
  snareBody: Tone.MembraneSynth;
  snareRoomNoise: Tone.NoiseSynth;
  closedHat: Tone.NoiseSynth;
  openHat: Tone.NoiseSynth;
  tom: Tone.MembraneSynth;
  nodes: Array<{ dispose: () => void }>;
}

interface MasterBus {
  input: Tone.Volume;
  nodes: Array<{ dispose: () => void }>;
}

export interface DrumEngine {
  master: Tone.Volume;
  kit: DrumKit;
  dispose: () => void;
}

const MIN_TRIGGER_GAP_SECONDS = 0.0005;
const SCHEDULE_AHEAD_SECONDS = 0.001;
const lastTriggerTimes = new WeakMap<DrumKit, Partial<Record<DrumVoice, number>>>();

export function configureLowLatencyAudio(): void {
  const context = Tone.getContext();
  context.lookAhead = 0;
  (context as Tone.Context).updateInterval = 0.005;
}

function createMasterBus(): MasterBus {
  const limiter = new Tone.Limiter(-1).toDestination();
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 3,
    attack: 0.003,
    release: 0.12,
  }).connect(limiter);
  const master = new Tone.Volume(-8).connect(compressor);

  return {
    input: master,
    nodes: [compressor, limiter],
  };
}

function createKickVoice(output: Tone.InputNode) {
  const kickFilter = new Tone.Filter({
    type: "lowpass",
    frequency: 180,
    Q: 0.7,
    rolloff: -24,
  }).connect(output);
  const kickDrive = new Tone.Distortion(0.14).connect(kickFilter);
  const kickTransientFilter = new Tone.Filter({
    type: "bandpass",
    frequency: 1050,
    Q: 1.2,
  }).connect(output);

  return {
    kick: new Tone.MembraneSynth({
      pitchDecay: 0.055,
      octaves: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.38, sustain: 0, release: 0.08 },
    }).connect(kickDrive),
    kickTransient: new Tone.MembraneSynth({
      pitchDecay: 0.006,
      octaves: 3,
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.2, decay: 0.018, sustain: 0, release: 0.01 },
    }).connect(kickTransientFilter),
    nodes: [kickFilter, kickDrive, kickTransientFilter],
  };
}

function createSnareVoice(output: Tone.InputNode) {
  const snareNoiseFilter = new Tone.Filter({
    type: "bandpass",
    frequency: 1650,
    Q: 0.65,
  }).connect(output);
  const snareBodyFilter = new Tone.Filter({
    type: "bandpass",
    frequency: 245,
    Q: 0.58,
  }).connect(output);
  const snareRoom = new Tone.Reverb({
    decay: 0.48,
    preDelay: 0.006,
    wet: 1,
  }).connect(output);
  const snareRoomSend = new Tone.Volume(-17).connect(snareRoom);
  const snareRoomFilter = new Tone.Filter({
    type: "bandpass",
    frequency: 1150,
    Q: 0.45,
  }).connect(snareRoomSend);

  return {
    snareNoise: new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.105, sustain: 0, release: 0.035 },
    }).connect(snareNoiseFilter),
    snareBody: new Tone.MembraneSynth({
      pitchDecay: 0.026,
      octaves: 2.2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0.015, release: 0.08 },
    }).connect(snareBodyFilter),
    snareRoomNoise: new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).connect(snareRoomFilter),
    nodes: [snareNoiseFilter, snareBodyFilter, snareRoom, snareRoomSend, snareRoomFilter],
  };
}

function createHatVoices(output: Tone.InputNode) {
  const closedHatFilter = new Tone.Filter({
    type: "highpass",
    frequency: 6800,
    Q: 0.9,
  }).connect(output);
  const openHatFilter = new Tone.Filter({
    type: "highpass",
    frequency: 5200,
    Q: 0.75,
  }).connect(output);

  return {
    closedHat: new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.026, sustain: 0, release: 0.012 },
    }).connect(closedHatFilter),
    openHat: new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.24, sustain: 0.02, release: 0.16 },
    }).connect(openHatFilter),
    nodes: [closedHatFilter, openHatFilter],
  };
}

function createTomVoice(output: Tone.InputNode) {
  const tomFilter = new Tone.Filter({
    type: "lowpass",
    frequency: 900,
    Q: 0.5,
    rolloff: -12,
  }).connect(output);
  const tomDrive = new Tone.Distortion(0.06).connect(tomFilter);

  return {
    tom: new Tone.MembraneSynth({
      pitchDecay: 0.035,
      octaves: 4.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.24, sustain: 0.01, release: 0.12 },
    }).connect(tomDrive),
    nodes: [tomFilter, tomDrive],
  };
}

function createSyntheticDrumKit(output: Tone.InputNode): DrumKit {
  const kick = createKickVoice(output);
  const snare = createSnareVoice(output);
  const hats = createHatVoices(output);
  const tom = createTomVoice(output);

  return {
    ...kick,
    ...snare,
    ...hats,
    ...tom,
    nodes: [...kick.nodes, ...snare.nodes, ...hats.nodes, ...tom.nodes],
  };
}

export function createDrumEngine(): DrumEngine {
  const masterBus = createMasterBus();
  const kit = createSyntheticDrumKit(masterBus.input);
  lastTriggerTimes.set(kit, {});

  return {
    master: masterBus.input,
    kit,
    dispose() {
      disposeDrumKit(kit);
      kit.nodes.forEach((node) => node.dispose());
      masterBus.nodes.forEach((node) => node.dispose());
      masterBus.input.dispose();
    },
  };
}

function disposeDrumKit(kit: DrumKit): void {
  kit.kick.dispose();
  kit.kickTransient.dispose();
  kit.snareNoise.dispose();
  kit.snareBody.dispose();
  kit.snareRoomNoise.dispose();
  kit.closedHat.dispose();
  kit.openHat.dispose();
  kit.tom.dispose();
}

export function setMasterVolume(handle: DrumEngine, volume: number): void {
  handle.master.volume.value = volume <= 0 ? -Infinity : Tone.gainToDb(volume);
}

export function setMasterMuted(handle: DrumEngine, muted: boolean): void {
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
      kit.kickTransient.triggerAttackRelease("G2", "64n", safeTime, safeVelocity * 0.18);
      break;
    case "snare":
      kit.snareBody.triggerAttackRelease("A2", "16n", safeTime, safeVelocity * 0.58);
      kit.snareNoise.triggerAttackRelease("32n", safeTime, safeVelocity * 0.42);
      kit.snareRoomNoise.triggerAttackRelease("16n", safeTime, safeVelocity * 0.3);
      break;
    case "closedHat":
      kit.closedHat.triggerAttackRelease("64n", safeTime, safeVelocity * 0.68);
      break;
    case "openHat":
      kit.openHat.triggerAttackRelease("8n", safeTime, safeVelocity * 0.58);
      break;
    case "tom":
      kit.tom.triggerAttackRelease("G1", "8n", safeTime, safeVelocity * 0.8);
      break;
  }
}
