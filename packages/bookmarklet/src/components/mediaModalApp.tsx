import { h } from "preact";
import { ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Program } from "../App";
import { formatVersionLabel, resolveShouldMuteVideos } from "../helpers/common";
import localize, { canUseLocale, getLocale, loadLocale, setLocale, SupportedLocale, supportedLocales } from "../helpers/localize";
import { LocalizationKey } from "../localization";
import { buildProxyDownloadUrl } from "../helpers/mediaFormatting";
import { MediaSlide } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
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

export const createMediaViewerStore = (selectedIndex = 0): MediaViewerStore => {
  const store = createStore<MediaViewerState>({
    expanded: false,
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
  left = "Instantgram",
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
  const proxyUrl = buildProxyDownloadUrl(directUrl, filename);
  const openInNewTab = program.settings.openInNewTab;

  return {
    href: openInNewTab ? directUrl : proxyUrl,
    rel: openInNewTab ? "noopener noreferrer" : undefined,
    target: openInNewTab ? "_blank" : undefined,
  };
};

const queueMediaRetry = (element: HTMLImageElement | HTMLVideoElement, mediaUrl: string, shouldMute: boolean) => {
  const retries = Number(element.dataset.mediaRetries || "0");
  if (retries >= 2) {
    return;
  }
  element.dataset.mediaRetries = String(retries + 1);

  setTimeout(() => {
    if (element instanceof HTMLVideoElement) {
      element.defaultMuted = shouldMute;
      element.muted = shouldMute;
      element.removeAttribute("src");
      element.load();
      element.src = mediaUrl;
      element.load();
      return;
    }

    element.removeAttribute("src");
    element.src = mediaUrl;
  }, (retries + 1) * 800);
};

const playFlipAnimation = (
  element: HTMLElement | null,
  firstRect: DOMRect | undefined,
  lastRect: DOMRect | undefined,
): Animation | null => {
  if (!element || !firstRect || !lastRect || !lastRect.width || !lastRect.height) {
    return null;
  }

  const scaleX = firstRect.width / lastRect.width;
  const scaleY = firstRect.height / lastRect.height;
  const translateX = firstRect.left - lastRect.left;
  const translateY = firstRect.top - lastRect.top;
  const noVisualChange = Math.abs(scaleX - 1) < 0.001
    && Math.abs(scaleY - 1) < 0.001
    && Math.abs(translateX) < 0.5
    && Math.abs(translateY) < 0.5;

  if (noVisualChange) {
    return null;
  }

  return element.animate([
    {
      transformOrigin: "top center",
      transform: `translate(${translateX}px,${translateY}px) scale(${scaleX},${scaleY})`,
    },
    {
      transformOrigin: "top center",
      transform: "translate(0,0) scale(1,1)",
    },
  ], {
    duration: 280,
    easing: "cubic-bezier(.22,.61,.36,1)",
    fill: "both",
  });
};

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
        const locale = event.currentTarget.value as SupportedLocale;
        if (!await loadLocale(locale)) return;
        setLocale(locale);
        console.info(localize("h.ld"));
        onLocaleChange();
      }}
    >
      {supportedLocales.map((locale) => (
        <option key={locale} value={locale} disabled={!canUseLocale(locale)}>
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
            <HeaderIconButton className="ima" innerHtml={props.expandIcon} pressed={state.expanded} onClick={() => props.store.toggleExpanded()} />
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
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [progressValues, setProgressValues] = useState(() => slides.map(() => 0));
  const previousExpandedRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    if (state.mode !== "media") {
      return undefined;
    }
    const rootElement = rootRef.current;
    const modalWindow = rootElement?.closest(`.${uiClasses.modal}`) as HTMLElement | null;
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
    const activeMedia = activeVideo || (rootElement.querySelectorAll<HTMLElement>(".slide img")[state.selectedIndex] ?? null);
    const previousMediaTransition = activeMedia?.style.transition ?? "";

    modalWindow.style.transition = "none";
    if (activeMedia) {
      activeMedia.style.transition = "none";
    }
    modalWindow.classList.toggle("ime", state.expanded);
    const lastModalRect = modalWindow.getBoundingClientRect();

    const animation = playFlipAnimation(modalWindow, firstModalRect, lastModalRect);
    previousExpandedRef.current = state.expanded;

    const finish = () => {
      modalWindow.style.transition = previousTransition;
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

    const timeoutId = setTimeout(() => {
      store.setExpanded(true);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [program.settings.autoExpand, state.mode, store]);

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
    const next = () => store.setSelectedIndex((state.selectedIndex + 1) % slides.length);
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

    if (video) {
      video.defaultMuted = video.muted = mute;
      const sync = () => {
        progress(video.duration && isFinite(video.duration) ? video.currentTime / video.duration * 100 : 0);
        if (!video.paused && !video.ended) frame = requestAnimationFrame(sync);
      };
      if (auto) video.onended = next;
      void video.play().then(() => {
        if (auto) sync();
      }).catch(() => {
        if (auto) timedProgress();
      });
    } else if (auto) {
      timedProgress();
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (video) {
        video.onended = null;
        video.pause();
      }
    };
  }, [program, slides, state.mode, state.selectedIndex, state.settingsVersion, store]);

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

  const shouldMute = resolveShouldMuteVideos(program);
  const activeSlide = slides[state.selectedIndex];
  const downloadProps = getDownloadProps(activeSlide, program);

  return (
    <div class="slider-container" ref={rootRef}>
      <div
        class="slider"
        style={{ transform: `translateX(-${state.selectedIndex * 100}%)` }}
      >
        {slides.map((slide, index) => {
          const shouldPreload = slides.length <= 1 || index === state.selectedIndex || index === (state.selectedIndex + 1) % slides.length;
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
                  onError={(event) => queueMediaRetry(event.currentTarget as HTMLVideoElement, slide.mediaUrl, shouldMute)}
                />
              ) : (
                <img
                  src={shouldPreload ? slide.mediaUrl : undefined}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => queueMediaRetry(event.currentTarget as HTMLImageElement, slide.mediaUrl, shouldMute)}
                />
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
      <div class={`slider-controls${program.settings.autoSlideshow && slides.length > 1 ? " autoplay" : ""}`}>
        {slides.map((_slide, index) => (
          <button
            key={index}
            type="button"
            class={index === state.selectedIndex ? "active" : undefined}
            style={{ "--progress": String(progressValues[index] || 0) }}
            onClick={() => store.setSelectedIndex(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
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
