import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Program } from "../../App";
import { resolveShouldMuteVideos } from "../../helpers/common";
import { playFlipAnimation } from "../../helpers/flipAnimation";
import { MediaSlide } from "../../model/MediaScanResult";
import { uiClasses } from "../shared/uiTokens";

type Refs = {
  rootRef: { current: HTMLDivElement | null };
  videoRefs: { current: Array<HTMLVideoElement | null> };
};

// Plays the shared grow/shrink FLIP animation whenever `expanded` toggles after the
// initial mount, so a manual click on the expand button and an auto-expand-on-open both
// look and feel identical (see helpers/flipAnimation.ts).
export const useExpandAnimation = (mode: string, expanded: boolean, selectedIndex: number, refs: Refs) => {
  const previousExpandedRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    if (mode !== "media") {
      return undefined;
    }
    const rootElement = refs.rootRef.current;
    const modalWindow = rootElement?.closest("."+uiClasses.modal) as HTMLElement | null;
    if (!modalWindow) {
      return undefined;
    }

    if (previousExpandedRef.current === null) {
      modalWindow.classList.toggle("ime", expanded);
      previousExpandedRef.current = expanded;
      return undefined;
    }

    if (previousExpandedRef.current === expanded) {
      return undefined;
    }

    const activeVideo = refs.videoRefs.current[selectedIndex];
    const firstModalRect = modalWindow.getBoundingClientRect();
    const previousTransition = modalWindow.style.transition;
    const previousOverflow = modalWindow.style.overflow;
    const activeMedia = activeVideo || (rootElement.querySelectorAll<HTMLElement>(".slide img")[selectedIndex] ?? null);
    const previousMediaTransition = activeMedia?.style.transition ?? "";

    modalWindow.style.transition = "none";
    // Clip the non-matching axis while a single uniform scale animates in, so tall media
    // never visibly spills outside the modal during the transition.
    modalWindow.style.overflow = "hidden";
    if (activeMedia) {
      activeMedia.style.transition = "none";
    }
    modalWindow.classList.toggle("ime", expanded);
    const lastModalRect = modalWindow.getBoundingClientRect();

    const animation = playFlipAnimation(modalWindow, firstModalRect, lastModalRect);
    previousExpandedRef.current = expanded;

    const finish = () => {
      modalWindow.style.transition = previousTransition;
      modalWindow.style.overflow = previousOverflow;
      if (activeMedia) {
        activeMedia.style.transition = previousMediaTransition;
      }
    };

    if (!animation) {
      finish();
      return undefined;
    }

    const settle = () => {
      animation.removeEventListener("finish", settle);
      animation.removeEventListener("cancel", settle);
      finish();
    };

    animation.addEventListener("finish", settle);
    animation.addEventListener("cancel", settle);

    return () => {
      animation.cancel();
      finish();
    };
  }, [expanded, selectedIndex]);
};

// Waits for the active slide's real <img>/<video> to be present and loaded (not still
// showing its fixed-height placeholder), then triggers store.setExpanded(true) -- driving
// the same useExpandAnimation transition a manual click would, so the auto-expand-on-open
// setting produces a genuine grow animation instead of skipping it on first mount.
export const useAutoExpand = (program: Program, mode: string, selectedIndex: number, setExpanded: (expanded: boolean) => void, refs: Refs) => {
  useEffect(() => {
    if (mode !== "media") {
      return undefined;
    }
    if (!program.settings.autoExpand) {
      return undefined;
    }

    let settled = false;
    const trigger = () => {
      if (settled) return;
      settled = true;
      clearInterval(pollId);
      clearTimeout(fallbackTimer);
      clearTimeout(delayTimer);
      setExpanded(true);
    };

    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    const isReady = () => {
      const activeVideo = refs.videoRefs.current[selectedIndex];
      if (activeVideo) return activeVideo.readyState >= 1;
      const activeSlideEl = refs.rootRef.current?.querySelectorAll<HTMLElement>(".slide")[selectedIndex];
      const activeImage = activeSlideEl?.querySelector<HTMLImageElement>("img") ?? null;
      return !!activeImage?.complete;
    };
    const pollId = setInterval(() => {
      if (isReady()) {
        // Keep a short pause once ready so the expand doesn't happen instantly on open.
        delayTimer = setTimeout(trigger, 500);
        clearInterval(pollId);
      }
    }, 100);
    const fallbackTimer = setTimeout(trigger, 3000);

    return () => {
      clearInterval(pollId);
      clearTimeout(fallbackTimer);
      clearTimeout(delayTimer);
    };
  }, [program.settings.autoExpand, mode, selectedIndex]);
};

export const useVideoMuteSync = (program: Program, mode: string, settingsVersion: number, videoRefs: Refs["videoRefs"]) => {
  useEffect(() => {
    if (mode !== "media") {
      return undefined;
    }
    const shouldMute = resolveShouldMuteVideos(program);
    videoRefs.current.forEach((video) => {
      if (!video) {
        return;
      }
      video.defaultMuted = shouldMute;
      video.muted = shouldMute;
      if (shouldMute) {
        video.setAttribute("muted", "");
      } else {
        video.removeAttribute("muted");
      }
    });
  }, [program, mode, settingsVersion]);
};

export const useAutoSlideshow = (
  program: Program,
  slides: MediaSlide[],
  mode: string,
  selectedIndex: number,
  settingsVersion: number,
  selectSlide: (index: number) => void,
  videoRefs: Refs["videoRefs"]
) => {
  const [progressValues, setProgressValues] = useState(() => slides.map(() => 0));

  useEffect(() => {
    if (mode !== "media" || !slides.length) return undefined;

    const mute = resolveShouldMuteVideos(program);
    let timer: ReturnType<typeof setTimeout>;
    let frame = 0;
    const video = videoRefs.current[selectedIndex];
    const auto = program.settings.autoSlideshow && slides.length > 1;
    const progress = (value: number) => {
      setProgressValues(slides.map((_, index) => (index === selectedIndex ? value : 0)));
    };
    const next = () => selectSlide((selectedIndex + 1) % slides.length);
    const timedProgress = () => {
      const started = performance.now();
      const tick = (now: number) => {
        const value = Math.min(100, (now - started) / 50);
        progress(value);
        if (value < 100) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      timer = setTimeout(next, 5000);
    };

    progress(0);

    let handleTimeUpdate: (() => void) | undefined;
    if (video) {
      video.defaultMuted = video.muted = mute;
      if (auto) {
        handleTimeUpdate = () => {
          progress(video.duration && isFinite(video.duration) ? (video.currentTime / video.duration) * 100 : 0);
        };
        video.addEventListener("timeupdate", handleTimeUpdate);
        video.onended = next;
      }
      void video.play().catch(() => {
        if (auto) timedProgress();
      });
    } else if (auto) {
      timedProgress();
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (video) {
        if (handleTimeUpdate) video.removeEventListener("timeupdate", handleTimeUpdate);
        video.onended = null;
        video.pause();
      }
    };
  }, [program, slides, mode, selectedIndex, settingsVersion]);

  return progressValues;
};
