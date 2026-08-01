import { h } from "preact";
import { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Program } from "../App";
import { formatVersionLabel, resolveShouldMuteVideos } from "../helpers/common";
import localize, { getLocale, loadLocale, localeUnavailableMessage, setLocale, SupportedLocale, supportedLocales } from "../helpers/localize";
import { LocalizationKey } from "../localization";
import { buildProxyDownloadUrl } from "../helpers/mediaFormatting";
import { MediaSlide } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
import { logoIconGlyphPath, logoIconGlyphTransform, logoIconPath, logoViewBox, logoWordmarkPath, logoWordmarkTransform } from "../helpers/logo";
import { useAutoExpand, useAutoSlideshow, useExpandAnimation, useVideoMuteSync } from "./mediaModalEffects";
import { useMediaSlider } from "./mediaSlider";
import { MediaViewerStore, SettingsConfig, UtilityViewerStore, useStoreState } from "./mediaViewerStore";
import { ModalContent } from "./Modal";
import { SettingsModalBody } from "./settingsModal";
import { uiClasses } from "./uiTokens";

export type { SettingsConfig } from "./settingsModal";
export type { MediaViewerStore, UtilityViewerStore } from "./mediaViewerStore";
export { createMediaViewerStore, createUtilityViewerStore } from "./mediaViewerStore";

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
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const refs = { rootRef, videoRefs };

  const {
    sliderRef,
    suppressClickRef,
    selectSlide,
    handleSliderPointerDown,
    handleSliderPointerMove,
    handleSliderPointerEnd,
  } = useMediaSlider(state.selectedIndex, slides.length, store.setSelectedIndex);

  useExpandAnimation(state.mode, state.expanded, state.selectedIndex, refs);
  useAutoExpand(program, state.mode, state.selectedIndex, store.setExpanded, refs);
  useVideoMuteSync(program, state.mode, state.settingsVersion, videoRefs);
  const progressValues = useAutoSlideshow(program, slides, state.mode, state.selectedIndex, state.settingsVersion, selectSlide, videoRefs);

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
