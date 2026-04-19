import { useMemo } from "react";
import * as Tone from "tone";
import type { DrumVoice } from "../lib/rhythm";
import { DRUM_VOICES, MAX_BPM, MAX_DIVISION, MIN_BPM, MIN_DIVISION } from "../lib/rhythm";
import { colorRings, MAX_TRACKS, useRhythmStore } from "../store/rhythmStore";
import { ChevronDownIcon, DeleteIcon } from "./Icons";

const voiceLabels = new Map(DRUM_VOICES.map((voice) => [voice.value, voice.label]));

export function TrackControlsPanel() {
  const rawRings = useRhythmStore((state) => state.rings);
  const selectedRingId = useRhythmStore((state) => state.selectedRingId);
  const bpm = useRhythmStore((state) => state.transport.bpm);
  const masterVolume = useRhythmStore((state) => state.transport.masterVolume);
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const changeBpm = useRhythmStore((state) => state.setBpm);
  const changeMasterVolume = useRhythmStore((state) => state.setMasterVolume);
  const changeRingDivision = useRhythmStore((state) => state.changeRingDivision);
  const changeRingVolume = useRhythmStore((state) => state.changeRingVolume);
  const changeRingVoice = useRhythmStore((state) => state.changeRingVoice);
  const addRing = useRhythmStore((state) => state.addRing);
  const deleteRing = useRhythmStore((state) => state.deleteRing);
  const selectRing = useRhythmStore((state) => state.selectRing);
  const togglePlayback = useRhythmStore((state) => state.togglePlayback);
  const rings = useMemo(() => colorRings(rawRings), [rawRings]);

  async function handleTogglePlayback() {
    await Tone.start();
    togglePlayback();
  }

  return (
    <section className="panel controls-panel">
      <div className="panel-heading">
        <button className="play-button" type="button" onClick={handleTogglePlayback}>
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>

      <div className="control-row">
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

      <div className="control-row">
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

      <p className="tracks-label">Tracks</p>
      <div className="ring-controls">
        {rings.map((ring) => (
          <div
            key={ring.id}
            className={ring.id === selectedRingId ? "ring-control active" : "ring-control"}
          >
            <div className="ring-control-heading">
              <button type="button" onClick={() => selectRing(ring.id)}>
                <span className="ring-swatch" style={{ background: ring.color }} />
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
                >
                  {DRUM_VOICES.map((voice) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="voice-select-icon" />
              </span>
              <button
                className="delete-ring-button"
                type="button"
                onClick={() => deleteRing(ring.id)}
                disabled={rings.length <= 1}
                aria-label={`Delete ${ring.label}`}
              >
                <DeleteIcon />
              </button>
            </div>

            <div className="ring-control-param">
              <span>Steps</span>
              <input
                type="number"
                min={MIN_DIVISION}
                max={MAX_DIVISION}
                value={ring.division}
                onChange={(event) => changeRingDivision(ring.id, Number(event.target.value))}
              />
            </div>

            <div className="ring-control-param">
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
        ))}
        {rings.length < MAX_TRACKS && (
          <button className="add-ring-button ring-control add-ring-item" type="button" onClick={addRing}>
            Add Track
          </button>
        )}
      </div>
    </section>
  );
}
