import { useMemo, useState } from "react";
import type { DrumVoice, GroovePreset, Preset, Ring } from "../lib/rhythm";
import {
  DRUM_VOICES,
  MAX_BPM,
  MAX_DIVISION,
  MIN_BPM,
  MIN_DIVISION,
  USER_PRESET_CATEGORY,
} from "../lib/rhythm";

type PresetMode = "grooves" | "tracks";

interface SidebarProps {
  bpm: number;
  masterVolume: number;
  grooves: GroovePreset[];
  presets: Preset[];
  rings: Ring[];
  selectedRingId: string;
  isPlaying: boolean;
  maxTracks: number;
  onApplyGroovePreset: (presetId: string) => void;
  onApplyPreset: (presetId: string) => void;
  onSaveGroovePreset: (name: string) => void;
  onSaveTrackPreset: (name: string) => void;
  onDeleteGroovePreset: (presetId: string) => void;
  onDeleteTrackPreset: (presetId: string) => void;
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
  grooves,
  presets,
  rings,
  selectedRingId,
  isPlaying,
  maxTracks,
  onApplyGroovePreset,
  onApplyPreset,
  onSaveGroovePreset,
  onSaveTrackPreset,
  onDeleteGroovePreset,
  onDeleteTrackPreset,
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
  const voiceLabels = new Map(DRUM_VOICES.map((voice) => [voice.value, voice.label]));
  const [presetMode, setPresetMode] = useState<PresetMode>("grooves");
  const [activePresetCategory, setActivePresetCategory] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const presetSource = presetMode === "grooves" ? grooves : presets;
  const presetCategories = useMemo(
    () => [
      USER_PRESET_CATEGORY,
      ...Array.from(
        new Set(
          presetSource
            .map((preset) => preset.category)
            .filter((category) => category !== USER_PRESET_CATEGORY),
        ),
      ),
    ],
    [presetSource],
  );
  const selectedPresetCategory = presetCategories.includes(activePresetCategory)
    ? activePresetCategory
    : presetCategories[0] ?? "";
  const visibleGrooves = grooves.filter((preset) => preset.category === selectedPresetCategory);
  const visiblePresets = presets.filter((preset) => preset.category === selectedPresetCategory);
  const selectedPreset =
    presetMode === "grooves"
      ? visibleGrooves.find((preset) => preset.id === selectedPresetId)
      : visiblePresets.find((preset) => preset.id === selectedPresetId);
  const canDeleteSelectedPreset =
    selectedPresetCategory === USER_PRESET_CATEGORY && selectedPreset !== undefined;
  const defaultSaveName = presetMode === "grooves" ? "Saved Groove" : "Saved Track";

  const renderStarIcon = () => (
    <svg className="preset-star-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.6 3 1.1-6.2L2.9 9.4l6.3-.9L12 2.8z" />
    </svg>
  );

  function handleConfirmSave() {
    const name = savePresetName.trim() || defaultSaveName;
    if (presetMode === "grooves") {
      onSaveGroovePreset(name);
    } else {
      onSaveTrackPreset(name);
    }

    setSavePresetName("");
    setIsSaveDialogOpen(false);
    setActivePresetCategory(USER_PRESET_CATEGORY);
    setSelectedPresetId("");
  }

  function handleApplySelectedPreset() {
    if (!selectedPreset) {
      return;
    }

    if (presetMode === "grooves") {
      onApplyGroovePreset(selectedPreset.id);
    } else {
      onApplyPreset(selectedPreset.id);
    }
  }

  function handleDeleteSelectedPreset() {
    if (!canDeleteSelectedPreset || !selectedPreset) {
      return;
    }

    if (presetMode === "grooves") {
      onDeleteGroovePreset(selectedPreset.id);
    } else {
      onDeleteTrackPreset(selectedPreset.id);
    }
    setSelectedPresetId("");
  }

  return (
    <aside className="sidebar">
      <section className="panel preset-panel">
        <div className="panel-heading">
          <p className="eyebrow">Presets</p>
        </div>

        <div className="preset-tabs preset-mode-tabs" role="tablist" aria-label="Preset modes">
          <button
            type="button"
            role="tab"
            aria-selected={presetMode === "grooves"}
            className={presetMode === "grooves" ? "preset-tab active" : "preset-tab"}
            onClick={() => {
              setPresetMode("grooves");
              setActivePresetCategory("");
              setSelectedPresetId("");
            }}
          >
            Groove
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={presetMode === "tracks"}
            className={presetMode === "tracks" ? "preset-tab active" : "preset-tab"}
            onClick={() => {
              setPresetMode("tracks");
              setActivePresetCategory("");
              setSelectedPresetId("");
            }}
          >
            Track
          </button>
        </div>

        <div className="preset-tabs" role="tablist" aria-label="Preset categories">
          {presetCategories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={category === selectedPresetCategory}
              aria-label={category === USER_PRESET_CATEGORY ? "Saved presets" : undefined}
              className={category === selectedPresetCategory ? "preset-tab active" : "preset-tab"}
              onClick={() => {
                setActivePresetCategory(category);
                setSelectedPresetId("");
              }}
            >
              {category === USER_PRESET_CATEGORY ? renderStarIcon() : category}
            </button>
          ))}
        </div>

        <div className="preset-list">
          {presetMode === "grooves"
            ? visibleGrooves.map((preset) => (
                <button
                  key={preset.id}
                  className={preset.id === selectedPresetId ? "preset-button selected" : "preset-button"}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  onDoubleClick={() => onApplyGroovePreset(preset.id)}
                >
                  <span>{preset.name}</span>
                  <small>{preset.rings.length} tracks</small>
                </button>
              ))
            : visiblePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={preset.id === selectedPresetId ? "preset-button selected" : "preset-button"}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  onDoubleClick={() => onApplyPreset(preset.id)}
                >
                  <span>{preset.name}</span>
                  <small>{preset.division} steps</small>
                </button>
              ))}
        </div>

        <div className="preset-actions">
          <button
            className="preset-action-button"
            type="button"
            onClick={() => {
              setSavePresetName(defaultSaveName);
              setIsSaveDialogOpen(true);
            }}
            aria-label={presetMode === "grooves" ? "Save groove preset" : "Save track preset"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4h11l3 3v13H5z" />
              <path d="M8 4v6h8" />
              <path d="M8 17h8" />
            </svg>
          </button>
          <button
            className="preset-action-button"
            type="button"
            onClick={handleDeleteSelectedPreset}
            disabled={!canDeleteSelectedPreset}
            aria-label={presetMode === "grooves" ? "Delete selected groove preset" : "Delete selected track preset"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          </button>
          <div style={{flexGrow: 1}} />
          <button
            className="preset-action-button"
            type="button"
            onClick={handleApplySelectedPreset}
            disabled={!selectedPreset}
            aria-label={presetMode === "grooves" ? "Apply selected groove preset" : "Apply selected track preset"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5l11 7-11 7z" />
            </svg>
          </button>
        </div>
      </section>

      {isSaveDialogOpen && (
        <div className="preset-dialog-backdrop" role="presentation">
          <form
            className="preset-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Save preset"
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirmSave();
            }}
          >
            <label>
              <span>Name</span>
              <input
                type="text"
                value={savePresetName}
                onChange={(event) => setSavePresetName(event.target.value)}
                autoFocus
              />
            </label>
            <div className="preset-dialog-actions">
              <button type="button" onClick={() => setIsSaveDialogOpen(false)}>
                Cancel
              </button>
              <button type="submit">OK</button>
            </div>
          </form>
        </div>
      )}

      <section className="panel controls-panel">
        <div className="panel-heading">
          <button className="play-button" type="button" onClick={onTogglePlayback}>
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
            onChange={(event) => onChangeBpm(Number(event.target.value))}
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
            onChange={(event) => onChangeMasterVolume(Number(event.target.value))}
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
                <button type="button" onClick={() => onSelectRing(ring.id)}>
                  <span className="ring-swatch" style={{ background: ring.color }} />
                  <span className="ring-title">{voiceLabels.get(ring.voice) ?? ring.voice}</span>
                </button>
                <span className="voice-select-wrap">
                  <select
                    className="voice-select"
                    value={ring.voice}
                    onChange={(event) => {
                      onSelectRing(ring.id);
                      onChangeRingVoice(ring.id, event.target.value as DrumVoice);
                    }}
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

              <div className="ring-control-param">
                <span>Steps</span>
                <input
                  type="number"
                  min={MIN_DIVISION}
                  max={MAX_DIVISION}
                  value={ring.division}
                  onChange={(event) => onChangeRingDivision(ring.id, Number(event.target.value))}
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
                  onChange={(event) => onChangeRingVolume(ring.id, Number(event.target.value))}
                />
              </div>
            </div>
          ))}
          {rings.length < maxTracks && (
            <button className="add-ring-button ring-control add-ring-item" type="button" onClick={onAddRing}>
              Add Track
            </button>
          )}
        </div>
      </section>
    </aside>
  );
}
