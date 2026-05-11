import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ArrangementDock } from "./components/ArrangementDock";
import { PanelLeftIcon, PanelRightIcon } from "./components/Icons";
import { Inspector } from "./components/Inspector";
import { RadialSequencer } from "./components/RadialSequencer";
import { Sidebar } from "./components/Sidebar";
import { useDrumPlaybackEngine } from "./hooks/useDrumPlaybackEngine";
import { ensureAudioReady } from "./lib/audio";
import { useRhythmStore } from "./store/rhythmStore";
import "./styles/app.css";

export default function App() {
  const settingsLoaded = useRhythmStore((state) => state.settingsLoaded);
  const hydrate = useRhythmStore((state) => state.hydrate);
  const togglePlayback = useRhythmStore((state) => state.togglePlayback);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const leftPanelShellRef = useRef<HTMLDivElement | null>(null);
  const rightPanelShellRef = useRef<HTMLDivElement | null>(null);
  useDrumPlaybackEngine();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    const syncOrientation = () => {
      const nextIsPortrait = mediaQuery.matches;
      setIsPortrait(nextIsPortrait);
      if (nextIsPortrait) {
        setIsLeftPanelOpen(false);
        setIsRightPanelOpen(false);
      } else {
        setIsLeftPanelOpen(true);
        setIsRightPanelOpen(true);
      }
    };

    syncOrientation();
    mediaQuery.addEventListener("change", syncOrientation);
    return () => mediaQuery.removeEventListener("change", syncOrientation);
  }, []);

  useEffect(() => {
    function unlockAudio() {
      void ensureAudioReady();
    }

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

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
      void ensureAudioReady().then(() => {
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

  function toggleLeftPanel() {
    setIsLeftPanelOpen((current) => {
      const next = !current;
      if (isPortrait && next) {
        setIsRightPanelOpen(false);
      }
      return next;
    });
  }

  function toggleRightPanel() {
    setIsRightPanelOpen((current) => {
      const next = !current;
      if (isPortrait && next) {
        setIsLeftPanelOpen(false);
      }
      return next;
    });
  }

  function closePanels() {
    setIsLeftPanelOpen(false);
    setIsRightPanelOpen(false);
  }

  function handlePanelScrimPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePanelScrimClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    closePanels();
  }

  const showPanelScrim = isPortrait && (isLeftPanelOpen || isRightPanelOpen);

  return (
    <main className="app-shell">
      <div className={`workspace${isPortrait ? " is-portrait" : ""}${isLeftPanelOpen ? "" : " left-collapsed"}${isRightPanelOpen ? "" : " right-collapsed"}`}>
        {showPanelScrim ? (
          <button
            className="workspace-scrim"
            type="button"
            aria-label="Close side panel"
            onPointerDown={handlePanelScrimPointerDown}
            onClick={handlePanelScrimClick}
          />
        ) : null}

        <div
          className={isLeftPanelOpen ? "panel-shell left-panel-shell is-open" : "panel-shell left-panel-shell"}
          ref={leftPanelShellRef}
        >
          <button
            className={`panel-toggle panel-toggle-left floating-overlay-button ui-button ui-icon-button${isLeftPanelOpen ? " is-open" : ""}`}
            type="button"
            onClick={toggleLeftPanel}
            aria-pressed={isLeftPanelOpen}
            title={isLeftPanelOpen ? "Collapse left panel" : "Expand left panel"}
          >
            <PanelLeftIcon />
          </button>
          <div className="panel-shell-body">
            <Sidebar />
          </div>
        </div>

        <div className="center-stage">
          <RadialSequencer />
        </div>

        <div
          className={isRightPanelOpen ? "panel-shell right-panel-shell is-open" : "panel-shell right-panel-shell"}
          ref={rightPanelShellRef}
        >
          <div className="panel-shell-body">
            <Inspector />
          </div>
          <button
            className={`panel-toggle panel-toggle-right floating-overlay-button ui-button ui-icon-button${isRightPanelOpen ? " is-open" : ""}`}
            type="button"
            onClick={toggleRightPanel}
            aria-pressed={isRightPanelOpen}
            title={isRightPanelOpen ? "Collapse right panel" : "Expand right panel"}
          >
            <PanelRightIcon />
          </button>
        </div>
      </div>

      <ArrangementDock />
    </main>
  );
}
