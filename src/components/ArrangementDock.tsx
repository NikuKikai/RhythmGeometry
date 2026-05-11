import * as Tone from "tone";
import { HorizontalScrollViewport } from "./HorizontalScrollViewport";
import { SectionStrip } from "./radial-sequencer/SectionStrip";
import { FollowSectionsIcon } from "./Icons";
import { Timeline } from "./Timeline";
import { useRhythmStore } from "../store/rhythmStore";

export function ArrangementDock() {
  const isPlaying = useRhythmStore((state) => state.transport.isPlaying);
  const autoFollowSection = useRhythmStore((state) => state.transport.autoFollowSection);
  const togglePlayback = useRhythmStore((state) => state.togglePlayback);
  const setAutoFollowSection = useRhythmStore((state) => state.setAutoFollowSection);

  async function handleTogglePlayback() {
    await Tone.start();
    togglePlayback();
  }

  return (
    <section className="arrangement-dock" aria-label="Arrangement controls">
      <div className="arrangement-toolbar">
        <div className="arrangement-transport">
          <button
            className="play-button ui-button"
            type="button"
            onClick={handleTogglePlayback}
            title={isPlaying ? "Pause playback" : "Start playback"}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            className={autoFollowSection ? "transport-toggle ui-button ui-icon-button is-active" : "transport-toggle ui-button ui-icon-button"}
            type="button"
            onClick={() => setAutoFollowSection(!autoFollowSection)}
            aria-pressed={autoFollowSection}
            title={autoFollowSection ? "Auto-follow playback section" : "Keep current section while playing"}
          >
            <FollowSectionsIcon />
          </button>
        </div>

        <HorizontalScrollViewport
          className="arrangement-sections"
          contentClassName="arrangement-sections-content"
          topInset={20}
          bottomInset={6}
          ariaLabel="Groove sections"
        >
          <SectionStrip />
        </HorizontalScrollViewport>
      </div>

      <Timeline />
    </section>
  );
}
