import { memo, useState } from "react";
import * as Tone from "tone";
import { useShallow } from "zustand/react/shallow";
import type { DrumVoice } from "../lib/rhythm";
import { clampDivision, DRUM_VOICES, MAX_BPM, MAX_DIVISION, MIN_BPM, MIN_DIVISION } from "../lib/rhythm";
import { getTrackColor, MAX_TRACKS, useRhythmStore } from "../store/rhythmStore";
import { ChevronDownIcon, DeleteIcon } from "./Icons";

const voiceLabels = new Map(DRUM_VOICES.map((voice) => [voice.value, voice.label]));
const MAX_STEP_DELTA = 4;

interface StepDeltaDrag {
  originDivision: number;
  delta: number;
}

interface TrackControlItemProps {
  ringId: string;
  ringIndex: number;
}

interface DeleteRingButtonProps {
  ringId: string;
  ringLabel: string;
}

const TransportControls = memo(function TransportControls() {
  const bpm = useRhythmStore((state) => state.transport.bpm);
  const masterVolume = useRhythmStore((state) => state.transport.masterVolume);
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const changeBpm = useRhythmStore((state) => state.setBpm);
  const changeMasterVolume = useRhythmStore((state) => state.setMasterVolume);
  const togglePlayback = useRhythmStore((state) => state.togglePlayback);

  async function handleTogglePlayback() {
    await Tone.start();
    togglePlayback();
  }

  return (
    <>
      <div className="panel-heading">
        <button
          className="play-button ui-button"
          type="button"
          onClick={handleTogglePlayback}
          title={isPlaying ? "Pause playback" : "Start playback"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <div className="control-row control-grid-row">
        <span>BPM</span>
        <span className="value-readout">{bpm}</span>
        <input
          type="range"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(event) => changeBpm(Number(event.target.value))}
        />
      </div>

      <div className="control-row control-grid-row">
        <span>Volume</span>
        <span className="value-readout">{Math.round(masterVolume * 100)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume}
          onChange={(event) => changeMasterVolume(Number(event.target.value))}
        />
      </div>
    </>
  );
});

const DeleteRingButton = memo(function DeleteRingButton({
  ringId,
  ringLabel,
}: DeleteRingButtonProps) {
  const ringCount = useRhythmStore((state) => state.rings.length);
  const deleteRing = useRhythmStore((state) => state.deleteRing);

  return (
    <button
      className="delete-ring-button ui-button ui-icon-button"
      type="button"
      onClick={() => deleteRing(ringId)}
      disabled={ringCount <= 1}
      aria-label={`Delete ${ringLabel}`}
      title={`Delete ${ringLabel}`}
    >
      <DeleteIcon />
    </button>
  );
});

const TrackControlItem = memo(function TrackControlItem({
  ringId,
  ringIndex,
}: TrackControlItemProps) {
  const ring = useRhythmStore(
    useShallow((state) => {
      const currentRing = state.rings.find((item) => item.id === ringId);
      return currentRing
        ? {
            id: currentRing.id,
            label: currentRing.label,
            division: currentRing.division,
            phaseOffset: currentRing.phaseOffset,
            voice: currentRing.voice,
            volume: currentRing.volume,
          }
        : null;
    }),
  );
  const isSelected = useRhythmStore((state) => state.selectedRingId === ringId);
  const changeRingDivision = useRhythmStore((state) => state.changeRingDivision);
  const changeRingPhaseOffset = useRhythmStore((state) => state.changeRingPhaseOffset);
  const changeRingVolume = useRhythmStore((state) => state.changeRingVolume);
  const changeRingVoice = useRhythmStore((state) => state.changeRingVoice);
  const selectRing = useRhythmStore((state) => state.selectRing);
  const [stepDeltaDrag, setStepDeltaDrag] = useState<StepDeltaDrag | null>(null);

  if (!ring) {
    return null;
  }

  function startStepDeltaDrag(originDivision: number) {
    setStepDeltaDrag({ originDivision, delta: 0 });
  }

  function changeStepDelta(currentDivision: number, delta: number) {
    const activeDrag = stepDeltaDrag ?? { originDivision: currentDivision, delta: 0 };
    const nextDelta = Math.round(delta);

    setStepDeltaDrag({ ...activeDrag, delta: nextDelta });
    changeRingDivision(ringId, clampDivision(activeDrag.originDivision + nextDelta));
  }

  function endStepDeltaDrag() {
    setStepDeltaDrag(null);
  }

  return (
    <div className={isSelected ? "ring-control active" : "ring-control"}>
      <div className="ring-control-heading">
        <button
          className="ring-control-select-button ui-button"
          type="button"
          onClick={() => selectRing(ring.id)}
          title={`Select ${ring.label}`}
        >
          <span className="ring-swatch" style={{ background: getTrackColor(ringIndex) }} />
          <span className="ring-title">{voiceLabels.get(ring.voice) ?? ring.voice}</span>
        </button>
        <span className="voice-select-wrap">
          <select
            className="voice-select"
            value={ring.voice}
            onChange={(event) => {
              selectRing(ring.id);
              changeRingVoice(ring.id, event.target.value as DrumVoice);
            }}
            aria-label={`${ring.label} voice`}
            title={`Change ${ring.label} voice`}
          >
            {DRUM_VOICES.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="voice-select-icon" />
        </span>
        <DeleteRingButton ringId={ring.id} ringLabel={ring.label} />
      </div>

      <div className="ring-control-param control-grid-row">
        <span>Steps</span>
        <input
          type="number"
          min={MIN_DIVISION}
          max={MAX_DIVISION}
          value={ring.division}
          onChange={(event) => changeRingDivision(ring.id, Number(event.target.value))}
        />
        <input
          className="steps-delta-slider"
          type="range"
          min={-MAX_STEP_DELTA}
          max={MAX_STEP_DELTA}
          step="1"
          value={stepDeltaDrag?.delta ?? 0}
          onPointerDown={() => startStepDeltaDrag(ring.division)}
          onChange={(event) => changeStepDelta(ring.division, Number(event.target.value))}
          onPointerUp={endStepDeltaDrag}
          onPointerCancel={endStepDeltaDrag}
          onBlur={endStepDeltaDrag}
          title={`${ring.label} steps delta`}
        />
      </div>

      <div className="ring-control-param control-grid-row">
        <span>Offset</span>
        <span className="value-readout">{ring.phaseOffset.toFixed(2)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={ring.phaseOffset}
          onChange={(event) => changeRingPhaseOffset(ring.id, Number(event.target.value))}
          title={`${ring.label} phase offset`}
        />
      </div>

      <div className="ring-control-param control-grid-row">
        <span>Volume</span>
        <span className="value-readout">{Math.round(ring.volume * 100)}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ring.volume}
          onChange={(event) => changeRingVolume(ring.id, Number(event.target.value))}
        />
      </div>
    </div>
  );
});

const AddTrackButton = memo(function AddTrackButton() {
  const ringCount = useRhythmStore((state) => state.rings.length);
  const addRing = useRhythmStore((state) => state.addRing);

  if (ringCount >= MAX_TRACKS) {
    return null;
  }

  return (
    <button
      className="add-ring-button ui-button"
      type="button"
      onClick={addRing}
      title="Add track"
    >
      Add Track
    </button>
  );
});

export function TrackControlsPanel() {
  const ringIds = useRhythmStore(useShallow((state) => state.rings.map((ring) => ring.id)));

  return (
    <section className="panel controls-panel">
      <TransportControls />

      <p className="tracks-label">Tracks</p>
      <div className="ring-controls">
        {ringIds.map((ringId, ringIndex) => (
          <TrackControlItem
            key={ringId}
            ringId={ringId}
            ringIndex={ringIndex}
          />
        ))}
        <AddTrackButton />
      </div>
    </section>
  );
}
