import { h } from "preact";
import { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Program } from "../App";
import { formatVersionLabel, resolveShouldMuteVideos } from "../helpers/common";
import localize, { getLocale, loadLocale, localeUnavailableMessage, setLocale, SupportedLocale, supportedLocales } from "../helpers/localize";
import { LocalizationKey } from "../localization";
import { buildProxyDownloadUrl } from "../helpers/mediaFormatting";
import { MediaSlide } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
import { logoIconGlyphPath, logoIconGlyphTransform, logoIconPath, logoViewBox, logoWordmarkPath, logoWordmarkTransform } from "../helpers/logo";
import { playFlipAnimation } from "../helpers/flipAnimation";
import { ModalContent } from "./Modal";
import { SettingsConfig, SettingsModalBody } from "./settingsModal";
import { uiClasses } from "./uiTokens";

type MediaViewerState = {
  expanded: boolean;
  mode: "media" | "settings";
  selectedIndex: number;
  settingsVersion: number;
};

type MediaViewerListener = () => void;
type UtilityViewerMode = "message" | "settings";

type UtilityViewerState = {
  mode: UtilityViewerMode;
  settingsVersion: number;
};

type UtilityViewerListener = () => void;

type StoreLike<TState> = {
  getState(): TState;
  subscribe(listener: () => void): () => void;
};

export type { SettingsConfig } from "./settingsModal";

export type MediaViewerStore = {
  bumpSettingsVersion(): void;
  closeSettings(): void;
  getState(): MediaViewerState;
  openSettings(): void;
  setExpanded(expanded: boolean): void;
  setSelectedIndex(selectedIndex: number): void;
  subscribe(listener: MediaViewerListener): () => void;
  toggleExpanded(): void;
};

export type UtilityViewerStore = {
  bumpSettingsVersion(): void;
  closeSettings(): void;
  getState(): UtilityViewerState;
  openSettings(): void;
  subscribe(listener: UtilityViewerListener): () => void;
};

const createStore = <TState,>(state: TState) => {
  const listeners = new Set<() => void>();
  const update = (nextState: Partial<TState>) => {
    state = { ...state, ...nextState };
    listeners.forEach((listener) => listener());
  };
  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update,
  };
};

export const createMediaViewerStore = (selectedIndex = 0, expanded = false): MediaViewerStore => {
  const store = createStore<MediaViewerState>({
    expanded,
    mode: "media",
    selectedIndex,
    settingsVersion: 0,
  });

  return {
    bumpSettingsVersion: () => store.update({ settingsVersion: store.getState().settingsVersion + 1 }),
    closeSettings: () => store.update({ mode: "media" }),
    getState: store.getState,
    openSettings: () => store.update({ mode: "settings" }),
    setExpanded: (expanded) => store.getState().expanded === expanded || store.update({ expanded }),
    setSelectedIndex: (selectedIndexValue) => store.getState().selectedIndex === selectedIndexValue || store.update({ selectedIndex: selectedIndexValue }),
    subscribe: store.subscribe,
    toggleExpanded: () => store.update({ expanded: !store.getState().expanded }),
  };
};

export const createUtilityViewerStore = (): UtilityViewerStore => {
  const store = createStore<UtilityViewerState>({
    mode: "message",
    settingsVersion: 0,
  });

  return {
    bumpSettingsVersion: () => store.update({ settingsVersion: store.getState().settingsVersion + 1 }),
    closeSettings: () => store.update({ mode: "message" }),
    getState: store.getState,
    openSettings: () => store.update({ mode: "settings" }),
    subscribe: store.subscribe,
  };
};

const useStoreState = <TState,>(store: StoreLike<TState>) => {
  const [state, setState] = useState(store.getState());

  useEffect(() => store.subscribe(() => setState(store.getState())), [store]);

  return state;
};

export function LoadingBody() {
  return (
    <div class={uiClasses.loading}>
      <div class={uiClasses.loadingSpinner} aria-hidden="true" />
      <div class={uiClasses.loadingText}>{localize("l")}</div>
    </div>
  );
}

export function UtilityMessageBody({ body, localizationKey }: { body?: string; localizationKey?: LocalizationKey }) {
  return <div dangerouslySetInnerHTML={{ __html: localizationKey ? localize(localizationKey) : body || "" }} />;
}

export function NotFoundBody({
  messageKey,
  exampleUrl,
  linkRel,
}: {
  messageKey: LocalizationKey;
  exampleUrl: string;
  linkRel: string;
}) {
  return (
    <>
      <div>{localize(messageKey)}</div>
      <div style="text-align:center">
        <a style="color:black" href={exampleUrl} target="_blank" rel={linkRel}>
          {exampleUrl}
        </a>
      </div>
    </>
  );
}

export function HeaderIconButton({
  className,
  innerHtml,
  pressed,
  onClick,
}: {
  className: string;
  innerHtml: string;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      class={className}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: innerHtml }}
    />
  );
}

function BaseHeading({
  left = (
    <svg class="igb" viewBox={logoViewBox} role="img" aria-label="instantgram">
      <path class="igi" d={logoIconPath} />
      <path class="igg" transform={logoIconGlyphTransform} d={logoIconGlyphPath} />
      <path class="igt" transform={logoWordmarkTransform} d={logoWordmarkPath} fill-rule="evenodd" />
    </svg>
  ),
  middle,
  right,
}: {
  left?: ComponentChildren;
  middle?: ComponentChildren;
  right?: ComponentChildren;
}) {
  return (
    <h5>
      <span class="hl">{left}</span>
      <span class="hm">{middle}</span>
      <span class="hr">{right}</span>
    </h5>
  );
}

export function UtilityModalHeading({
  version,
  settingsButton,
}: {
  version: string;
  settingsButton?: ComponentChildren;
}) {
  return <BaseHeading right={<><span>{formatVersionLabel(version)}</span>{settingsButton}</>} />;
}

const getDownloadProps = (slide: MediaSlide, program: Program) => {
  const directUrl = slide.downloadAttributes["data-direct-url"] || slide.mediaUrl;
  const filename = slide.downloadAttributes["data-static-filename"];
  const sourceUrl = window.location.origin + window.location.pathname;
  const proxyUrl = buildProxyDownloadUrl(directUrl, filename, program.VERSION, sourceUrl);
  const openInNewTab = program.settings.openInNewTab;

  return {
    href: openInNewTab ? directUrl : proxyUrl,
    rel: openInNewTab ? "noopener noreferrer" : undefined,
    target: openInNewTab ? "_blank" : undefined,
  };
};

const queueVideoRetry = (element: HTMLVideoElement, mediaUrl: string, shouldMute: boolean) => {
  const retries = Number(element.dataset.mediaRetries || "0");
  if (retries >= 2) {
    return;
  }
  element.dataset.mediaRetries = String(retries + 1);

  setTimeout(() => {
    element.defaultMuted = shouldMute;
    element.muted = shouldMute;
    element.removeAttribute("src");
    element.load();
    element.src = mediaUrl;
    element.load();
  }, (retries + 1) * 800);
};

function SlideImage({ mediaUrl, shouldPreload }: { mediaUrl: string; shouldPreload: boolean }) {
  const [readyUrl, setReadyUrl] = useState<string>();

  useEffect(() => {
    if (!shouldPreload || readyUrl === mediaUrl) {
      return undefined;
    }

    let cancelled = false;
    let retryTimer = 0;
    const preload = (retry = 0) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (!cancelled) setReadyUrl(mediaUrl);
      };
      image.onerror = () => {
        if (!cancelled && retry < 2) {
          retryTimer = window.setTimeout(() => preload(retry + 1), (retry + 1) * 800);
        }
      };
      image.src = mediaUrl;
    };
    preload();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [mediaUrl, readyUrl, shouldPreload]);

  return readyUrl === mediaUrl ? (
    <img
      src={readyUrl}
      decoding="async"
      draggable={false}
      onError={() => setReadyUrl(undefined)}
    />
  ) : <div class="slide-placeholder" aria-hidden="true" />;
}


const buildSettingsRight = (version: string, closeSettings: () => void, onLocaleChange: () => void) => (
  <>
    <span>{version}</span>
    <select
      id="instantgram-language"
      name="instantgram-language"
      class="il"
      aria-label="Language"
      value={getLocale()}
      onChange={async (event) => {
        const select = event.currentTarget;
        const locale = select.value as SupportedLocale;
        if (!await loadLocale(locale)) {
          alert(localeUnavailableMessage);
          select.value = getLocale();
          return;
        }
        setLocale(locale);
        console.info(localize("h.ld"));
        onLocaleChange();
      }}
    >
      {supportedLocales.map((locale) => (
        <option key={locale} value={locale}>
          {locale.slice(0, 2).toUpperCase()}
        </option>
      ))}
    </select>
    <HeaderIconButton className="ima ib" innerHtml="<i>&#8592;</i>" onClick={closeSettings} />
  </>
);

const buildSettingsToggle = (settingsIcon: string, openSettings: () => void) => (
  <HeaderIconButton className={uiClasses.settings} innerHtml={settingsIcon} onClick={openSettings} />
);

export function ReactiveMediaModalHeading(props: {
  collapseIcon: string;
  expandIcon: string;
  settingsIcon: string;
  settingsTitle: string;
  store: MediaViewerStore;
  userLink: string;
  userName: string;
  version: string;
}) {
  const state = useStoreState(props.store);
  return state.mode === "settings"
    ? <BaseHeading middle={localize("ms.t")} right={buildSettingsRight(props.version, () => props.store.closeSettings(), () => props.store.bumpSettingsVersion())} />
    : (
      <BaseHeading
        middle={<a href={props.userLink}>@{props.userName}</a>}
        right={
          <>
            <HeaderIconButton
              className="ima"
              innerHtml={state.expanded ? props.collapseIcon : props.expandIcon}
              pressed={state.expanded}
              onClick={() => props.store.toggleExpanded()}
            />
            {buildSettingsToggle(props.settingsIcon, () => props.store.openSettings())}
          </>
        }
      />
    );
}

export function ReactiveMediaModalBody({
  onSettingChange,
  program,
  settings,
  slides,
  store,
}: {
  onSettingChange: (settingKey: string, value: string | boolean) => void;
  program: Program;
  settings: SettingsConfig[];
  slides: MediaSlide[];
  store: MediaViewerStore;
}) {
  const state = useStoreState(store);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [progressValues, setProgressValues] = useState(() => slides.map(() => 0));
  const previousExpandedRef = useRef<boolean | null>(null);
  const selectSlide = (index: number) => {
    const slider = sliderRef.current;
    if (slider && Math.abs(state.selectedIndex - index) > 1) {
      slider.style.transition = "none";
      store.setSelectedIndex(index);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        slider.style.transition = "";
      }));
      return;
    }
    store.setSelectedIndex(index);
  };

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
    width: number;
    baseTranslate: number;
    offset: number;
    lastX: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const endDrag = (nextIndex: number) => {
    const slider = sliderRef.current;
    dragRef.current = null;
    if (!slider) return;
    slider.classList.remove("dragging");
    slider.style.transition = "";
    slider.style.transform = "translateX(-"+nextIndex*100+"%)";
    selectSlide(nextIndex);
  };

  const handleSliderPointerDown = (event: PointerEvent) => {
    if (slides.length <= 1 || event.button > 0) return;
    const slider = sliderRef.current;
    const width = slider?.getBoundingClientRect().width;
    if (!slider || !width) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      width,
      baseTranslate: -state.selectedIndex * width,
      offset: 0,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
  };

  const handleSliderPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    const slider = sliderRef.current;
    if (!drag || !slider || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.dragging = true;
      suppressClickRef.current = true;
      slider.classList.add("dragging");
      slider.style.transition = "none";
      slider.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const dt = event.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;

    const atStart = state.selectedIndex === 0 && dx > 0;
    const atEnd = state.selectedIndex === slides.length - 1 && dx < 0;
    drag.offset = atStart || atEnd ? dx * 0.35 : dx;
    slider.style.transform = "translateX("+(drag.baseTranslate+drag.offset)+"px)";
  };

  const handleSliderPointerEnd = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.dragging) {
      dragRef.current = null;
      return;
    }
    const ratio = drag.offset / drag.width;
    const flick = Math.abs(drag.velocity) > 0.35;
    let nextIndex = state.selectedIndex;
    if (flick || Math.abs(ratio) > 0.2) {
      nextIndex += drag.offset < 0 ? 1 : -1;
    }
    nextIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    endDrag(nextIndex);
  };

  useLayoutEffect(() => {
    if (state.mode !== "media") {
      return undefined;
    }
    const rootElement = rootRef.current;
    const modalWindow = rootElement?.closest("."+uiClasses.modal) as HTMLElement | null;
    if (!modalWindow) {
      return undefined;
    }

    if (previousExpandedRef.current === null) {
      modalWindow.classList.toggle("ime", state.expanded);
      previousExpandedRef.current = state.expanded;
      return undefined;
    }

    if (previousExpandedRef.current === state.expanded) {
      return undefined;
    }

    const activeVideo = videoRefs.current[state.selectedIndex];
    const firstModalRect = modalWindow.getBoundingClientRect();
    const previousTransition = modalWindow.style.transition;
    const previousOverflow = modalWindow.style.overflow;
    const activeMedia = activeVideo || (rootElement.querySelectorAll<HTMLElement>(".slide img")[state.selectedIndex] ?? null);
    const previousMediaTransition = activeMedia?.style.transition ?? "";

    modalWindow.style.transition = "none";
    // Clip the non-matching axis while a single uniform scale animates in, so tall media
    // never visibly spills outside the modal during the transition.
    modalWindow.style.overflow = "hidden";
    if (activeMedia) {
      activeMedia.style.transition = "none";
    }
    modalWindow.classList.toggle("ime", state.expanded);
    const lastModalRect = modalWindow.getBoundingClientRect();

    const animation = playFlipAnimation(modalWindow, firstModalRect, lastModalRect);
    previousExpandedRef.current = state.expanded;

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
  }, [state.expanded, state.selectedIndex]);

  useEffect(() => {
    if (state.mode !== "media") {
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
      store.setExpanded(true);
    };

    // The active slide may still be showing its .slide-placeholder (fixed 300px height)
    // instead of the real <img>/<video> at this point, since image loading is async and
    // this effect fires as soon as the modal mounts. Poll until the real media element is
    // present AND loaded, so the FLIP animation always measures the true expanded size,
    // same as it does for a manual click (which can only happen once you can see it).
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    const isReady = () => {
      const activeVideo = videoRefs.current[state.selectedIndex];
      if (activeVideo) return activeVideo.readyState >= 1;
      const activeSlideEl = rootRef.current?.querySelectorAll<HTMLElement>(".slide")[state.selectedIndex];
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
  }, [program.settings.autoExpand, state.mode, state.selectedIndex, store]);

  useEffect(() => {
    if (state.mode !== "media") {
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
  }, [program, state.mode, state.settingsVersion]);

  useEffect(() => {
    if (state.mode !== "media" || !slides.length) return undefined;

    const mute = resolveShouldMuteVideos(program);
    let timer: ReturnType<typeof setTimeout>;
    let frame = 0;
    const video = videoRefs.current[state.selectedIndex];
    const auto = program.settings.autoSlideshow && slides.length > 1;
    const progress = (value: number) => {
      setProgressValues(slides.map((_, index) => (index === state.selectedIndex ? value : 0)));
    };
    const next = () => selectSlide((state.selectedIndex + 1) % slides.length);
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
  }, [program, slides, state.mode, state.selectedIndex, state.settingsVersion, store]);

  const shouldMute = resolveShouldMuteVideos(program);
  const activeSlide = slides[state.selectedIndex];
  const downloadProps = getDownloadProps(activeSlide, program);

  return (
    <>
      {state.mode === "settings" && (
        <SettingsModalBody
          program={program}
          settings={settings}
          onSettingChange={(settingKey, value) => {
            onSettingChange(settingKey, value);
            store.bumpSettingsVersion();
          }}
        />
      )}
    <div class="slider-container" ref={rootRef} style={{ display: state.mode === "settings" ? "none" : undefined }}>
      <div
        class="slider"
        ref={sliderRef}
        style={{ transform: "translateX(-"+state.selectedIndex*100+"%)" }}
        onPointerDown={handleSliderPointerDown}
        onPointerMove={handleSliderPointerMove}
        onPointerUp={handleSliderPointerEnd}
        onPointerCancel={handleSliderPointerEnd}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {slides.map((slide, index) => {
          const shouldPreload = slides.length <= 1
            || index === state.selectedIndex
            || index === (state.selectedIndex + 1) % slides.length
            || index === (state.selectedIndex - 1 + slides.length) % slides.length;
          return (
            <div class="slide" key={index}>
              {slide.mediaType === MediaType.Video ? (
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  style={{ background: "black" }}
                  height="450"
                  src={shouldPreload ? slide.mediaUrl : undefined}
                  controls
                  preload={shouldPreload ? "metadata" : "none"}
                  muted={shouldMute}
                  onError={(event) => queueVideoRetry(event.currentTarget, slide.mediaUrl, shouldMute)}
                />
              ) : (
                <SlideImage mediaUrl={slide.mediaUrl} shouldPreload={shouldPreload} />
              )}
            </div>
          );
        })}
      </div>
      <a
        href={downloadProps.href}
        {...activeSlide.downloadAttributes}
        target={downloadProps.target}
        rel={downloadProps.rel}
        class={uiClasses.modalDb}
      >
        {activeSlide.downloadLabel}
      </a>
      <div class="slider-controls">
        {slides.map((_slide, index) => {
          const isActive = index === state.selectedIndex;
          const isProgressing = isActive && (progressValues[index] || 0) > 0;
          return (
            <button
              key={index}
              type="button"
              class={[isActive ? "active" : undefined, isProgressing ? "progressing" : undefined].filter(Boolean).join(" ") || undefined}
              style={{ "--progress": String(progressValues[index] || 0) }}
              onClick={() => selectSlide(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}

export function ReactiveUtilityModalHeading(props: {
  programVersion: string;
  settingsIcon: string;
  settingsTitle: string;
  store: UtilityViewerStore;
}) {
  const state = useStoreState(props.store);
  return state.mode === "settings"
    ? <BaseHeading middle={localize("ms.t")} right={buildSettingsRight(props.programVersion, () => props.store.closeSettings(), () => props.store.bumpSettingsVersion())} />
    : <BaseHeading right={<><span>{props.programVersion}</span>{buildSettingsToggle(props.settingsIcon, () => props.store.openSettings())}</>} />;
}

export function ReactiveUtilityModalBody({
  body,
  onSettingChange,
  program,
  settings,
  store,
}: {
  body: ModalContent;
  onSettingChange: (settingKey: string, value: string | boolean) => void;
  program: Program;
  settings: SettingsConfig[];
  store: UtilityViewerStore;
}) {
  const state = useStoreState(store);

  if (state.mode === "settings") {
    return (
      <SettingsModalBody
        program={program}
        settings={settings}
        onSettingChange={(settingKey, value) => {
          onSettingChange(settingKey, value);
          store.bumpSettingsVersion();
        }}
      />
    );
  }

  return <>{body}</>;
}
