import { PresetPanel } from "./PresetPanel";
import { TrackControlsPanel } from "./TrackControlsPanel";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <PresetPanel />
      <TrackControlsPanel />
    </aside>
  );
}
