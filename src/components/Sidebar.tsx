import type { DrumVoice, GroovePreset, Preset, Ring } from "../lib/rhythm";
import { PresetPanel } from "./PresetPanel";
import { TrackControlsPanel } from "./TrackControlsPanel";

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
  return (
    <aside className="sidebar">
      <PresetPanel
        grooves={grooves}
        presets={presets}
        onApplyGroovePreset={onApplyGroovePreset}
        onApplyPreset={onApplyPreset}
        onSaveGroovePreset={onSaveGroovePreset}
        onSaveTrackPreset={onSaveTrackPreset}
        onDeleteGroovePreset={onDeleteGroovePreset}
        onDeleteTrackPreset={onDeleteTrackPreset}
      />

      <TrackControlsPanel
        bpm={bpm}
        masterVolume={masterVolume}
        rings={rings}
        selectedRingId={selectedRingId}
        isPlaying={isPlaying}
        maxTracks={maxTracks}
        onChangeBpm={onChangeBpm}
        onChangeMasterVolume={onChangeMasterVolume}
        onChangeRingDivision={onChangeRingDivision}
        onChangeRingVolume={onChangeRingVolume}
        onChangeRingVoice={onChangeRingVoice}
        onAddRing={onAddRing}
        onDeleteRing={onDeleteRing}
        onSelectRing={onSelectRing}
        onTogglePlayback={onTogglePlayback}
      />
    </aside>
  );
}
