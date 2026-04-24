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
          <button className="preset-dialog-button ui-button" type="button" onClick={onCancel} title="Cancel saving preset">
            Cancel
          </button>
          <button className="preset-dialog-button ui-button" type="submit" title="Save preset">
            OK
          </button>
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
  const presetPanel = useRhythmStore((state) => state.presetPanel);
  const setPresetPanelState = useRhythmStore((state) => state.setPresetPanelState);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const presetMode = presetPanel.mode;
  const activePresetCategory = presetPanel.category;
  const selectedPresetId = presetPanel.selectedPresetId;
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
  const savePresetLabel = presetMode === "grooves" ? "Save groove preset" : "Save track preset";
  const deletePresetLabel = presetMode === "grooves" ? "Delete selected groove preset" : "Delete selected track preset";
  const applyPresetLabel = presetMode === "grooves" ? "Apply selected groove preset" : "Apply selected track preset";

  function handleConfirmSave() {
    const name = savePresetName.trim() || defaultSaveName;
    if (presetMode === "grooves") {
      saveGroovePreset(name);
    } else {
      saveTrackPreset(name);
    }

    setSavePresetName("");
    setIsSaveDialogOpen(false);
    setPresetPanelState({ category: USER_PRESET_CATEGORY, selectedPresetId: "" });
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
    setPresetPanelState({ selectedPresetId: "" });
  }

  function handleChangeMode(mode: PresetMode) {
    setPresetPanelState({ mode, category: "", selectedPresetId: "" });
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
            title="Show groove presets"
            className={presetMode === "grooves" ? "preset-tab active" : "preset-tab"}
            onClick={() => handleChangeMode("grooves")}
          >
            Groove
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={presetMode === "tracks"}
            title="Show track presets"
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
              title={category === USER_PRESET_CATEGORY ? "Saved presets" : `${category} presets`}
              className={category === selectedPresetCategory ? "preset-tab active" : "preset-tab"}
              onClick={() => {
                setPresetPanelState({ category, selectedPresetId: "" });
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
                  className={preset.id === selectedPresetId ? "preset-button ui-button selected" : "preset-button ui-button"}
                  type="button"
                  title={`${preset.name}: click to select, double-click to apply`}
                  onClick={() => setPresetPanelState({ selectedPresetId: preset.id })}
                  onDoubleClick={() => applyGroovePreset(preset.id)}
                >
                  <span>{preset.name}</span>
                  <small>{preset.rings.length} tracks</small>
                </button>
              ))
            : visiblePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={preset.id === selectedPresetId ? "preset-button ui-button selected" : "preset-button ui-button"}
                  type="button"
                  title={`${preset.name}: click to select, double-click to apply`}
                  onClick={() => setPresetPanelState({ selectedPresetId: preset.id })}
                  onDoubleClick={() => applyTrackPreset(preset.id)}
                >
                  <span>{preset.name}</span>
                  <small>{preset.division} steps</small>
                </button>
              ))}
        </div>

        <div className="preset-actions">
          <button
            className="preset-action-button ui-button ui-icon-button"
            type="button"
            onClick={() => {
              setSavePresetName(defaultSaveName);
              setIsSaveDialogOpen(true);
            }}
            aria-label={savePresetLabel}
            title={savePresetLabel}
          >
            <SaveIcon />
          </button>
          <button
            className="preset-action-button ui-button ui-icon-button"
            type="button"
            onClick={handleDeleteSelectedPreset}
            disabled={!canDeleteSelectedPreset}
            aria-label={deletePresetLabel}
            title={deletePresetLabel}
          >
            <DeleteIcon />
          </button>
          <div className="preset-action-spacer" />
          <button
            className="preset-action-button ui-button ui-icon-button"
            type="button"
            onClick={handleApplySelectedPreset}
            disabled={!selectedPreset}
            aria-label={applyPresetLabel}
            title={applyPresetLabel}
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
