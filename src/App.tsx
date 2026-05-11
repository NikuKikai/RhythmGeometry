import { useEffect } from "react";
import * as Tone from "tone";
import { Inspector } from "./components/Inspector";
import { RadialSequencer } from "./components/RadialSequencer";
import { Sidebar } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import { useDrumPlaybackEngine } from "./hooks/useDrumPlaybackEngine";
import { useRhythmStore } from "./store/rhythmStore";
import "./styles/app.css";

export default function App() {
  const settingsLoaded = useRhythmStore((state) => state.settingsLoaded);
  const hydrate = useRhythmStore((state) => state.hydrate);
  const togglePlayback = useRhythmStore((state) => state.togglePlayback);
  useDrumPlaybackEngine();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, button"))
      ) {
        return;
      }

      event.preventDefault();
      void Tone.start().then(() => {
        togglePlayback();
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayback]);

  if (!settingsLoaded) {
    return (
      <main className="app-shell app-loading" aria-busy="true">
        <div className="loading-mark" />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="workspace">
        <Sidebar />

        <div className="center-stage">
          <RadialSequencer />
        </div>

        <Inspector />
      </div>

      <Timeline />
    </main>
  );
}
