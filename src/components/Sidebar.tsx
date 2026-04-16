import type { DrumVoice, Preset, Ring } from "../lib/rhythm";
import { DRUM_VOICES, MAX_BPM, MAX_DIVISION, MIN_BPM, MIN_DIVISION } from "../lib/rhythm";

interface SidebarProps {
  bpm: number;
  masterVolume: number;
  presets: Preset[];
  rings: Ring[];
  selectedRingId: string;
  isPlaying: boolean;
  onApplyPreset: (presetId: string) => void;
  onChangeBpm: (bpm: number) => void;
  onChangeMasterVolume: (volume: number) => void;
  onChangeRingDivision: (ringId: string, division: number) => void;
  onChangeRingVolume: (ringId: string, volume: number) => void;
  onChangeRingVoice: (ringId: string, voice: DrumVoice) => void;
  onAddRing: () => void;
  onDeleteRing: (ringId: string) => void;
  onSelectRing: (ringId: string) => void;
  onTogglePlayback: () => void;
}

export function Sidebar({
  bpm,
  masterVolume,
  presets,
  rings,
  selectedRingId,
  isPlaying,
  onApplyPreset,
  onChangeBpm,
  onChangeMasterVolume,
  onChangeRingDivision,
  onChangeRingVolume,
  onChangeRingVoice,
  onAddRing,
  onDeleteRing,
  onSelectRing,
  onTogglePlayback,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="panel preset-panel">
        <div className="panel-heading">
          <p className="eyebrow">Presets</p>
          <select
            value={selectedRingId}
            onChange={(event) => onSelectRing(event.target.value)}
            aria-label="Target ring"
          >
            {rings.map((ring) => (
              <option key={ring.id} value={ring.id}>
                {ring.label}
              </option>
            ))}
          </select>
        </div>

        <div className="preset-list">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="preset-button"
              type="button"
              onClick={() => onApplyPreset(preset.id)}
            >
              <span>{preset.name}</span>
              <small>{preset.division} steps</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel controls-panel">
        <div className="panel-heading">
          <p className="eyebrow">Transport</p>
          <button className="play-button" type="button" onClick={onTogglePlayback}>
            {isPlaying ? "Pause" : "Play"}
          </button>
        </div>

        <label className="control-row">
          <span>BPM</span>
          <span className="value-readout">{bpm}</span>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(event) => onChangeBpm(Number(event.target.value))}
          />
        </label>

        <label className="control-row">
          <span>Master Volume</span>
          <span className="value-readout">{Math.round(masterVolume * 100)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(event) => onChangeMasterVolume(Number(event.target.value))}
          />
        </label>

        <p className="tracks-label">Tracks</p>
        <div className="ring-controls">
          {rings.map((ring) => (
            <div
              key={ring.id}
              className={ring.id === selectedRingId ? "ring-control active" : "ring-control"}
            >
              <div className="ring-control-heading">
                <button type="button" onClick={() => onSelectRing(ring.id)}>
                  <span className="ring-swatch" style={{ background: ring.color }} />
                  {ring.label}
                </button>
                <span className="voice-select-wrap">
                  <select
                    className="voice-select"
                    value={ring.voice}
                    onChange={(event) =>
                      onChangeRingVoice(ring.id, event.target.value as DrumVoice)
                    }
                    aria-label={`${ring.label} voice`}
                  >
                    {DRUM_VOICES.map((voice) => (
                      <option key={voice.value} value={voice.value}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="voice-select-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
                <button
                  className="delete-ring-button"
                  type="button"
                  onClick={() => onDeleteRing(ring.id)}
                  disabled={rings.length <= 1}
                  aria-label={`Delete ${ring.label}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                </button>
              </div>

              <label>
                <span>Steps</span>
                <input
                  type="number"
                  min={MIN_DIVISION}
                  max={MAX_DIVISION}
                  value={ring.division}
                  onChange={(event) => onChangeRingDivision(ring.id, Number(event.target.value))}
                />
              </label>

              <label>
                <span>Volume</span>
                <span className="value-readout">{Math.round(ring.volume * 100)}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={ring.volume}
                  onChange={(event) => onChangeRingVolume(ring.id, Number(event.target.value))}
                />
              </label>
            </div>
          ))}
          <button className="add-ring-button ring-control add-ring-item" type="button" onClick={onAddRing}>
            Add Track
          </button>
        </div>
      </section>
    </aside>
  );
}
