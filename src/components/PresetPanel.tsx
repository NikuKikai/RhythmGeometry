import { useMemo, useState } from "react";
import type { GroovePreset, Preset } from "../lib/rhythm";
import { USER_PRESET_CATEGORY } from "../lib/rhythm";

type PresetMode = "grooves" | "tracks";

interface PresetPanelProps {
  grooves: GroovePreset[];
  presets: Preset[];
  onApplyGroovePreset: (presetId: string) => void;
  onApplyPreset: (presetId: string) => void;
  onSaveGroovePreset: (name: string) => void;
  onSaveTrackPreset: (name: string) => void;
  onDeleteGroovePreset: (presetId: string) => void;
  onDeleteTrackPreset: (presetId: string) => void;
}

interface SavePresetDialogProps {
  name: string;
  onChangeName: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

function StarIcon() {
  return (
    <svg className="preset-star-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8l2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.6 3 1.1-6.2L2.9 9.4l6.3-.9L12 2.8z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v6h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5l11 7-11 7z" />
    </svg>
  );
}

function SavePresetDialog({ name, onChangeName, onCancel, onConfirm }: SavePresetDialogProps) {
  return (
    <div className="preset-dialog-backdrop" role="presentation">
      <form
        className="preset-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Save preset"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <label>
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            autoFocus
          />
        </label>
        <div className="preset-dialog-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">OK</button>
        </div>
      </form>
    </div>
  );
}

export function PresetPanel({
  grooves,
  presets,
  onApplyGroovePreset,
  onApplyPreset,
  onSaveGroovePreset,
  onSaveTrackPreset,
  onDeleteGroovePreset,
  onDeleteTrackPreset,
}: PresetPanelProps) {
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

  function handleChangeMode(mode: PresetMode) {
    setPresetMode(mode);
    setActivePresetCategory("");
    setSelectedPresetId("");
  }

  return (
    <>
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
            onClick={() => handleChangeMode("grooves")}
          >
            Groove
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={presetMode === "tracks"}
            className={presetMode === "tracks" ? "preset-tab active" : "preset-tab"}
            onClick={() => handleChangeMode("tracks")}
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
              {category === USER_PRESET_CATEGORY ? <StarIcon /> : category}
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
            <SaveIcon />
          </button>
          <button
            className="preset-action-button"
            type="button"
            onClick={handleDeleteSelectedPreset}
            disabled={!canDeleteSelectedPreset}
            aria-label={presetMode === "grooves" ? "Delete selected groove preset" : "Delete selected track preset"}
          >
            <DeleteIcon />
          </button>
          <div className="preset-action-spacer" />
          <button
            className="preset-action-button"
            type="button"
            onClick={handleApplySelectedPreset}
            disabled={!selectedPreset}
            aria-label={presetMode === "grooves" ? "Apply selected groove preset" : "Apply selected track preset"}
          >
            <ApplyIcon />
          </button>
        </div>
      </section>

      {isSaveDialogOpen && (
        <SavePresetDialog
          name={savePresetName}
          onChangeName={setSavePresetName}
          onCancel={() => setIsSaveDialogOpen(false)}
          onConfirm={handleConfirmSave}
        />
      )}
    </>
  );
}
