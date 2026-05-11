import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

interface HorizontalScrollViewportProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  topInset?: number;
  bottomInset?: number;
  ariaLabel?: string;
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function HorizontalScrollViewport({
  children,
  className,
  contentClassName,
  topInset = 0,
  bottomInset = 0,
  ariaLabel,
}: HorizontalScrollViewportProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    isDragging: boolean;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const rootStyle = useMemo(
    () => ({
      "--scroll-viewport-top-inset": `${topInset}px`,
      "--scroll-viewport-bottom-inset": `${bottomInset}px`,
    }) as CSSProperties,
    [bottomInset, topInset],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) {
      return;
    }

    function updateFadeState() {
      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      setCanScrollLeft(scroller.scrollLeft > 0.5);
      setCanScrollRight(scroller.scrollLeft < maxScrollLeft - 0.5);
    }

    updateFadeState();
    scroller.addEventListener("scroll", updateFadeState, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateFadeState();
    });
    resizeObserver.observe(scroller);
    resizeObserver.observe(content);

    return () => {
      scroller.removeEventListener("scroll", updateFadeState);
      resizeObserver.disconnect();
    };
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      isDragging: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const dragState = dragStateRef.current;
    if (!scroller || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    if (!dragState.isDragging) {
      if (Math.abs(deltaX) < 6) {
        return;
      }
      dragState.isDragging = true;
      scroller.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    scroller.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (dragState.isDragging && scroller?.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className={joinClassNames("scroll-viewport", className)}
      style={rootStyle}
      aria-label={ariaLabel}
    >
      <div
        className={canScrollLeft ? "scroll-viewport-fade scroll-viewport-fade-left is-visible" : "scroll-viewport-fade scroll-viewport-fade-left"}
        aria-hidden="true"
      />
      <div
        className={canScrollRight ? "scroll-viewport-fade scroll-viewport-fade-right is-visible" : "scroll-viewport-fade scroll-viewport-fade-right"}
        aria-hidden="true"
      />
      <div
        ref={scrollerRef}
        className="scroll-viewport-scroller"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <div ref={contentRef} className={joinClassNames("scroll-viewport-content", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
