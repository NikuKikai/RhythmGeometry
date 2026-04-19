import { useMemo, useState } from "react";
import { USER_PRESET_CATEGORY } from "../lib/rhythm";
import { GROOVE_PRESETS, PRESETS } from "../lib/presets";
import { useRhythmStore } from "../store/rhythmStore";
import { ApplyIcon, DeleteIcon, SaveIcon, StarIcon } from "./Icons";

type PresetMode = "grooves" | "tracks";

interface SavePresetDialogProps {
  name: string;
  onChangeName: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
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

export function PresetPanel() {
  const userGrooves = useRhythmStore((state) => state.userGrooves);
  const userTrackPresets = useRhythmStore((state) => state.userTrackPresets);
  const applyGroovePreset = useRhythmStore((state) => state.applyGroovePreset);
  const applyTrackPreset = useRhythmStore((state) => state.applyTrackPreset);
  const saveGroovePreset = useRhythmStore((state) => state.saveGroovePreset);
  const saveTrackPreset = useRhythmStore((state) => state.saveTrackPreset);
  const deleteGroovePreset = useRhythmStore((state) => state.deleteGroovePreset);
  const deleteTrackPreset = useRhythmStore((state) => state.deleteTrackPreset);
  const [presetMode, setPresetMode] = useState<PresetMode>("grooves");
  const [activePresetCategory, setActivePresetCategory] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const grooves = useMemo(() => [...userGrooves, ...GROOVE_PRESETS], [userGrooves]);
  const presets = useMemo(() => [...userTrackPresets, ...PRESETS], [userTrackPresets]);
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
      saveGroovePreset(name);
    } else {
      saveTrackPreset(name);
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
      applyGroovePreset(selectedPreset.id);
    } else {
      applyTrackPreset(selectedPreset.id);
    }
  }

  function handleDeleteSelectedPreset() {
    if (!canDeleteSelectedPreset || !selectedPreset) {
      return;
    }

    if (presetMode === "grooves") {
      deleteGroovePreset(selectedPreset.id);
    } else {
      deleteTrackPreset(selectedPreset.id);
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
              {category === USER_PRESET_CATEGORY ? <StarIcon className="preset-star-icon" /> : category}
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
                  onDoubleClick={() => applyGroovePreset(preset.id)}
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
                  onDoubleClick={() => applyTrackPreset(preset.id)}
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
