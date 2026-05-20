import { Program } from "../App";
import { Module } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { Modal, ModalButton } from "../components/Modal";
import { cssCarouselSlider, cssGeneral, cssSlideOn, logo } from "../components/Interconnect";
import { uiClasses } from "../components/uiTokens";
import { FeedScanner } from "./FeedScanner";
import { PostAndReelScanner } from "./PostAndReelScanner";
import { ProfileScanner } from "./ProfileScanner";
import { ReelsScanner } from "./ReelsScanner";
import { StoriesScanner } from "./StoriesScanner";
import localize from "../helpers/localize";
import { userFilenameFormatter } from "../helpers/mediaFormatting";
import { buildModalHeader, formatVersionLabel } from "../helpers/common";

type MediaScannerSettingConfig = {
    id: string;
    pane: "general" | "stories";
    title: string;
    description: string;
    largeInput?: boolean;
};

type ScannerClass =
    | typeof StoriesScanner
    | typeof ProfileScanner
    | typeof FeedScanner
    | typeof PostAndReelScanner
    | typeof ReelsScanner;

const SETTINGS_CONFIG: MediaScannerSettingConfig[] = [
    { id: "settings_general_1", pane: "general", title: "msg.t1", description: "msg.d1" },
    { id: "settings_general_2", pane: "general", title: "msg.t2", description: "msg.d2" },
    { id: "settings_general_3", pane: "general", title: "msg.t3", description: "msg.d3" },
    { id: "settings_general_5", pane: "general", title: "msg.t5", description: "msg.d5" },
    { id: "settings_general_4", pane: "general", title: "msg.t4", description: "msg.d4", largeInput: true },
    { id: "settings_stories_1", pane: "stories", title: "mss.t1", description: "mss.d1" },
    { id: "settings_stories_2", pane: "stories", title: "mss.t2", description: "mss.d2" },
    { id: "settings_stories_3", pane: "stories", title: "mss.t3", description: "mss.d3" },
];

const SETTINGS_PROGRAM_KEYS = {
    settings_general_1: "showAds",
    settings_general_2: "openInNewTab",
    settings_general_3: "autoSlideshow",
    settings_general_4: "formattedFilenameInput",
    settings_general_5: "videosMuted",
    settings_stories_1: "storiesMuted",
    settings_stories_3: "noMultiStories",
} as const;

const SETTINGS_ICON_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"><circle cx="12" cy="12" r="8.635" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></circle><path d="M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796M7.678 4.522a1.269 1.269 0 0 1-1.03.096l-1.06-.348L4.27 5.587l.348 1.062a1.269 1.269 0 0 1-.096 1.03m11.8 11.799a1.269 1.269 0 0 1 1.03-.096l1.06.348 1.318-1.317-.348-1.062a1.269 1.269 0 0 1 .096-1.03m-14.956.001a1.269 1.269 0 0 1 .096 1.03l-.348 1.06 1.317 1.318 1.062-.348a1.269 1.269 0 0 1 1.03.096m11.799-11.8a1.269 1.269 0 0 1-.096-1.03l.348-1.06-1.317-1.318-1.062.348a1.269 1.269 0 0 1-1.03-.096" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg>`;
const EXPAND_ICON_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M9 3 3 9M15 3l6 6M21 15l-6 6M3 15l6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"></path></svg>`;

/**
 * MediaScanner is a module responsible for handling various media scanning tasks,
 * including managing settings, adding necessary styles to the page, and interacting with modals.
 */
export class MediaScanner implements Module {
    svgSettings = SETTINGS_ICON_SVG;
    svgExpand = EXPAND_ICON_SVG;
    private readonly postExampleUrl = "https://www.instagram.com/p/CIGrv1VMBkS/";
    private readonly expandButtonClass = "instg-modal-action";
    private readonly settingsChangedEvent = "instg:settings-change";
    private readonly expandTransitionStartEvent = "instg:media-expand-transition-start";
    private readonly expandTransitionEndEvent = "instg:media-expand-transition-end";
    private readonly modalBodyStyleReset = "padding:0!important";
    private readonly utilityBodyStyle = "text-align:center;padding:20px";
    private readonly externalRel = "noopener noreferrer";
    private readonly saveFilenameButtonId = "settings-general-btn-4";

    private getStyleId(program: Program, suffix: string): string {
        return `${program.DOM_PREFIX}-${suffix}`;
    }

    private toDomSettingId(settingId: string): string {
        return settingId.replace(/_/g, "-");
    }

    private syncProgramSetting(program: Program, settingKey: string, value: string | boolean): void {
        const programKey = SETTINGS_PROGRAM_KEYS[settingKey as keyof typeof SETTINGS_PROGRAM_KEYS];
        if (!programKey) {
            return;
        }

        if (programKey === "formattedFilenameInput") {
            program.settings.formattedFilenameInput = String(value);
            return;
        }

        program.settings[programKey] = Boolean(value);
    }

    private emitSettingsChanged(settingKey: string, value: string | boolean): void {
        document.dispatchEvent(new CustomEvent(this.settingsChangedEvent, {
            detail: { settingKey, value }
        }));
    }

    private openModal(config: {
        heading: string;
        body: string | HTMLElement;
        bodyStyle?: string | null;
        buttonList?: ModalButton[];
        closeOnOverlayClick?: boolean;
        callback?: Modal["callback"];
        onClose?: Modal["onClose"];
    }): Modal {
        const modal = new Modal({
            heading: [config.heading],
            body: [config.body],
            bodyStyle: config.bodyStyle ?? null,
            buttonList: config.buttonList || [],
            closeOnOverlayClick: config.closeOnOverlayClick,
            callback: config.callback,
            onClose: config.onClose,
        });
        void modal.open();
        return modal;
    }

    private refreshLiveDownloadLinks(modalElement: HTMLElement, program: Program): void {
        modalElement.querySelectorAll<HTMLAnchorElement>(`a.${uiClasses.modalDb}`).forEach((anchor) => {
            const directUrl = anchor.dataset.directUrl;
            if (!directUrl) {
                return;
            }

            const staticFilename = anchor.dataset.staticFilename;
            let filename = staticFilename;

            if (!filename) {
                const placeholders = {
                    Username: anchor.dataset.username || "",
                    Year: anchor.dataset.year || "",
                    Month: anchor.dataset.month || "",
                    Day: anchor.dataset.day || "",
                    Hour: anchor.dataset.hour || "",
                    Minute: anchor.dataset.minute || "",
                };
                const extension = anchor.dataset.extension || "jpg";
                const index = Number(anchor.dataset.index || "0");
                const formattedBase = userFilenameFormatter(program.settings.formattedFilenameInput, placeholders);
                filename = `${formattedBase}_${index + 1}.${extension}`;
            }

            const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(directUrl)}:${btoa(filename)}`;
            anchor.href = program.settings.openInNewTab ? directUrl : encodedUrl;
            if (program.settings.openInNewTab) {
                anchor.target = "_blank";
                anchor.rel = this.externalRel;
            } else {
                anchor.removeAttribute("target");
                anchor.removeAttribute("rel");
            }
        });
    }

    private applyLiveVideoSettings(modalElement: HTMLElement, program: Program): void {
        const shouldMute = window.location.pathname.startsWith("/stories/")
            ? program.settings.storiesMuted
            : program.settings.videosMuted;
        modalElement.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
            video.muted = shouldMute;
            if (shouldMute) {
                video.setAttribute("muted", "");
            } else {
                video.removeAttribute("muted");
            }
        });
    }

    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("MediaScanner").
     */
    public getName(): string {
        return "MediaScanner";
    }

    constructor() { }

    /**
     * Initializes listeners for the modal settings.
     * This method adds event listeners for tab switching, checkbox updates, and text input handling.
     * @param el The modal element that contains the settings.
     * @param program The program object that contains the configuration and context.
     */
    private initModalSettingsListeners(el: HTMLElement, program: Program) {
        const myTabs = document.querySelectorAll("div.st > button.tb");
        const panes = document.querySelectorAll(".tp");

        // Handle tab switching functionality
        const handleClick = (e: MouseEvent): void => {
            e.preventDefault(); // Prevent default tab behavior

            // Reset active states for all tabs and panes
            myTabs.forEach(t => t.classList.remove("active"));
            panes.forEach(p => p.classList.remove("show", "active"));

            const target = e.currentTarget as HTMLElement;
            target.classList.add("active");

            const activePaneID = target.getAttribute("data-target");
            if (activePaneID) {
                const activePane = document.querySelector(activePaneID) as HTMLElement;
                if (activePane) {
                    activePane.classList.add("show", "active");
                }
            }
        };

        // Attach the click event handler to each tab
        myTabs.forEach(tab => {
            tab.addEventListener("click", handleClick as EventListener);
        });

        // Handle checkbox interactions for settings
        Array.from(el.querySelectorAll<HTMLInputElement>('label.slideon input[type="checkbox"]')).forEach((checkbox) => {
            const checkboxKey = `${program.STORAGE_NAME}_${checkbox.id.replace(/-/g, "_")}`;
            checkbox.checked = localStorage.getItem(checkboxKey) === "true";
            checkbox.addEventListener("change", () => {
                localStorage.setItem(checkboxKey, String(checkbox.checked)); // Save state to localStorage
                const settingKey = checkbox.id.replace(/-/g, "_");
                this.syncProgramSetting(program, settingKey, checkbox.checked);
                this.emitSettingsChanged(settingKey, checkbox.checked);
            });
        });

        // Handle input text and button interaction for filename format
        const filenameSetting = SETTINGS_CONFIG.find(setting => setting.id === "settings_general_4");
        const inputFileFormat = filenameSetting
            ? el.querySelector<HTMLInputElement>(`#${this.toDomSettingId(filenameSetting.id)}`)
            : null;
        if (inputFileFormat) {
            const inputKey = `${program.STORAGE_NAME}_${filenameSetting.id}`;
            inputFileFormat.value = localStorage.getItem(inputKey) || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}";

            const saveFilenameFormatBtn = el.querySelector<HTMLElement>(`#${this.saveFilenameButtonId}`);
            saveFilenameFormatBtn.addEventListener("click", (event: Event) => {
                event.preventDefault();
                localStorage.setItem(inputKey, inputFileFormat.value); // Save input value to localStorage
                this.syncProgramSetting(program, filenameSetting.id, inputFileFormat.value);
                this.emitSettingsChanged(filenameSetting.id, inputFileFormat.value);
                this.updateInputButtonStyle(saveFilenameFormatBtn, "sd", uiClasses.btnPrimary, uiClasses.btnSuccess);
                setTimeout(() => {
                    this.updateInputButtonStyle(saveFilenameFormatBtn, "s", uiClasses.btnSuccess, uiClasses.btnPrimary);
                }, 1000);
            });
        }
    }

    /**
     * Initializes the necessary styles by appending them to the document.
     * It removes any previously added styles to avoid duplicates.
     * @param program The program object that contains the configuration and context.
     */
    private initializeStyles(program: Program): void {
        this.removeStyleTagsWithIDs([
            this.getStyleId(program, "cssGeneral"),
            this.getStyleId(program, "cssSlideOn"),
            this.getStyleId(program, "cssCarouselSlider")
        ]);

        // Add the required styles to the DOM
        this.appendStyles(this.getStyleId(program, "cssGeneral"), cssGeneral);
        this.appendStyles(this.getStyleId(program, "cssSlideOn"), cssSlideOn);
        this.appendStyles(this.getStyleId(program, "cssCarouselSlider"), cssCarouselSlider);
    }

    /**
     * Appends CSS styles to the document body.
     * @param styleId The ID for the style element.
     * @param cssContent The CSS content to be inserted.
     */
    private appendStyles(styleId: string, cssContent: string): void {
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.innerHTML = cssContent;
        document.body.appendChild(styleElement);
    }

    /**
     * Displays a modal dialog with the given content.
     * @param result The scan result to display in the modal.
     * @param heading The heading for the modal.
     * @param bodyStyle The style to apply to the body of the modal.
     * @param buttonList The list of buttons to include in the modal.
     * @param callback The callback function to execute after the modal is opened.
     */
    private displayModal(result: MediaScanResult, heading: string, bodyStyle: string, buttonList: ModalButton[], callback) {
        this.openModal({
            heading,
            body: result.modalBody,
            bodyStyle,
            buttonList,
            callback,
        });
    }

    private createLoadingModal(program: Program): Modal {
        return new Modal({
            heading: [buildModalHeader(logo, formatVersionLabel(program.VERSION))],
            body: [`<div class="${uiClasses.loading}">
                <div class="${uiClasses.loadingSpinner}" aria-hidden="true"></div>
                <div class="${uiClasses.loadingText}">${localize("l")}</div>
            </div>`],
            bodyStyle: this.modalBodyStyleReset,
            buttonList: [],
            closeOnOverlayClick: false,
        });
    }

    private buildNotFoundBody(): string {
        return `${localize("a.nf")}<br/><div style="text-align:center"><a style="color:black" href="${this.postExampleUrl}" target="_blank" rel="${this.externalRel}">${this.postExampleUrl}</a></div>`;
    }

    private buildSettingsAction(): string {
        return `<button class="${uiClasses.settings}">${this.svgSettings}</button>`;
    }

    private buildUtilityHeading(program: Program): string {
        return buildModalHeader(logo, `${formatVersionLabel(program.VERSION)}${this.buildSettingsAction()}`);
    }

    private buildMediaHeading(userLink: string, userName: string): string {
        return buildModalHeader(
            logo,
            `<button class="${this.expandButtonClass}" type="button" aria-pressed="false" title="Grosser anzeigen">${this.svgExpand}</button>${this.buildSettingsAction()}`,
            `<a href="${userLink}">@${userName}</a>`
        );
    }

    private buildSettingsHeading(program: Program): string {
        return buildModalHeader(logo, `<span style="margin-right:0">${formatVersionLabel(program.VERSION)}</span>`, localize("ms.t"));
    }

    private resolveScannerClass(program: Program): ScannerClass | null {
        const { pathname } = window.location;
        return program.regexStoriesURI.test(pathname) ? StoriesScanner :
            program.regexProfilePath.test(pathname) ? ProfileScanner :
                program.regexRootPath.test(pathname) ? FeedScanner :
                    (program.regexPostPath.test(pathname) || program.regexReelURI.test(pathname)) ? PostAndReelScanner :
                        program.regexReelsURI.test(pathname) ? ReelsScanner :
                            null;
    }

    private initSlider(modalElement: HTMLElement, selectedSliderIndex: number, program: Program): void {
        const slider = modalElement.querySelector(".slider") as HTMLElement | null;
        const sliderContainer = modalElement.querySelector(".slider-container") as HTMLElement | null;
        const slides = Array.from(modalElement.querySelectorAll(".slide")) as HTMLElement[];
        const sliderControls = modalElement.querySelector(".slider-controls") as HTMLElement | null;
        const modalWindow = modalElement.querySelector(`.${uiClasses.modal}`) as HTMLElement | null;
        let sliderIndex = selectedSliderIndex;
        let slideTimer: ReturnType<typeof setTimeout> | undefined;
        let progressAnimationFrame: number | undefined;
        let isAdvancing = false;
        let realignTimeout: ReturnType<typeof setTimeout> | undefined;
        let playbackSession = 0;
        let isExpandTransitioning = false;
        let activeVideo: HTMLVideoElement | null = null;

        if (!slider || !sliderContainer || !sliderControls || !modalWindow || slides.length === 0) {
            return;
        }

        slides.forEach((_slide, i) => {
            const button = document.createElement("button");
            button.textContent = String(i + 1);
            button.dataset.index = String(i);
            button.classList.toggle("active", slides.length === 1);
            if (slides.length > 1) {
                button.addEventListener("click", () => {
                    sliderIndex = i;
                    updateSliderPosition(true);
                });
            }
            sliderControls.appendChild(button);
        });

        const clearVideoState = (video: HTMLVideoElement | null, reset = false) => {
            if (!video) {
                return;
            }
            video.onended = null;
            video.ontimeupdate = null;
            video.onseeking = null;
            video.onseeked = null;
            video.pause();
            if (reset) {
                video.currentTime = 0;
            }
            if (activeVideo === video) {
                activeVideo = null;
            }
        };

        const stopActivePlayback = (reset: boolean) => {
            playbackSession += 1;
            clearTimeout(slideTimer);
            slideTimer = undefined;
            if (progressAnimationFrame) {
                cancelAnimationFrame(progressAnimationFrame);
                progressAnimationFrame = undefined;
            }
            clearVideoState(activeVideo, reset);
        };

        const advanceSlide = () => {
            if (isAdvancing) {
                return;
            }
            isAdvancing = true;
            sliderIndex = (sliderIndex + 1) % slides.length;
            updateSliderPosition(false);
            isAdvancing = false;
        };

        const restartSlideTimer = (currentSession = playbackSession) => {
            const durationMs = 5000;
            const startedAt = performance.now();
            const currentButton = sliderControls.children[sliderIndex] as HTMLElement | undefined;
            currentButton?.style.setProperty("--progress", "0");

            const updateTimerProgress = (timestamp: number) => {
                if (currentSession !== playbackSession) {
                    return;
                }
                const progress = Math.max(0, Math.min(100, ((timestamp - startedAt) / durationMs) * 100));
                currentButton?.style.setProperty("--progress", progress.toFixed(2));
                if (progress < 100) {
                    progressAnimationFrame = requestAnimationFrame(updateTimerProgress);
                }
            };

            if (progressAnimationFrame) {
                cancelAnimationFrame(progressAnimationFrame);
            }
            progressAnimationFrame = requestAnimationFrame(updateTimerProgress);
            slideTimer = setTimeout(() => {
                if (currentSession === playbackSession) {
                    advanceSlide();
                }
            }, durationMs);
        };

        const checkAndPlayVideoOrStartTimer = () => {
            playbackSession += 1;
            const currentSession = playbackSession;
            const currentSlide = slides[sliderIndex];
            const currentButton = sliderControls.children[sliderIndex] as HTMLElement | undefined;
            const video = currentSlide.querySelector("video") as HTMLVideoElement | null;
            const isCurrentSlide = () => currentSession === playbackSession && slides[sliderIndex] === currentSlide;
            if (slides.length <= 1) {
                currentButton?.style.setProperty("--progress", "0");
                if (video) {
                    activeVideo = video;
                    video.onended = null;
                    video.ontimeupdate = null;
                    video.onseeking = null;
                    video.onseeked = null;
                    void video.play().catch(() => undefined);
                }
                return;
            }
            if (video) {
                activeVideo = video;
                const syncVideoProgress = () => {
                    if (!isCurrentSlide()) {
                        return;
                    }
                    const duration = video.duration;
                    const progress = duration && Number.isFinite(duration)
                        ? Math.max(0, Math.min(100, (video.currentTime / duration) * 100))
                        : 0;
                    currentButton?.style.setProperty("--progress", progress.toFixed(2));
                };
                const updateVideoProgress = () => {
                    if (!isCurrentSlide()) {
                        return;
                    }
                    syncVideoProgress();
                    if (!video.paused && !video.ended) {
                        progressAnimationFrame = requestAnimationFrame(updateVideoProgress);
                    }
                };
                video.onended = () => {
                    if (isCurrentSlide()) {
                        advanceSlide();
                    }
                };
                video.ontimeupdate = syncVideoProgress;
                video.onseeking = syncVideoProgress;
                video.onseeked = syncVideoProgress;
                currentButton?.style.setProperty("--progress", "0");
                void video.play().catch(() => restartSlideTimer());
                progressAnimationFrame = requestAnimationFrame(updateVideoProgress);
                return;
            }
            restartSlideTimer(currentSession);
        };

        const updateSliderPosition = (resetTimer: boolean, immediate = false) => {
            if (document.fullscreenElement) {
                return;
            }
            stopActivePlayback(false);
            const slideWidth = sliderContainer.clientWidth || slides[0].clientWidth;
            const previousTransition = slider.style.transition;
            if (immediate) {
                slider.style.transition = "none";
            }
            slider.style.transform = `translateX(${-slideWidth * sliderIndex}px)`;
            if (immediate) {
                requestAnimationFrame(() => {
                    slider.style.transition = previousTransition;
                });
            }
            Array.from(sliderControls.children).forEach((button, index) => {
                button.classList.toggle("active", index === sliderIndex);
                (button as HTMLElement).style.setProperty("--progress", "0");
            });

            if (resetTimer) {
                clearTimeout(slideTimer);
                slideTimer = undefined;
            }
            const currentSlideHasVideo = Boolean(slides[sliderIndex]?.querySelector("video"));
            const shouldRunProgress = localStorage.getItem(`${program.STORAGE_NAME}_settings_general_3`) === "true"
                || currentSlideHasVideo;
            if (shouldRunProgress) {
                checkAndPlayVideoOrStartTimer();
            }
        };

        const queueSliderRealign = () => {
            if (isExpandTransitioning) {
                return;
            }
            if (realignTimeout) {
                clearTimeout(realignTimeout);
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    updateSliderPosition(false, true);
                });
            });
            realignTimeout = setTimeout(() => {
                updateSliderPosition(false, true);
            }, 320);
        };

        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                clearTimeout(slideTimer);
            }
        };

        const handleExpandTransitionStart = () => {
            isExpandTransitioning = true;
            stopActivePlayback(false);
        };

        const handleExpandTransitionEnd = () => {
            isExpandTransitioning = false;
            queueSliderRealign();
        };

        const handleSettingsChanged = (event: Event) => {
            const customEvent = event as CustomEvent<{ settingKey: string; value: string | boolean; }>;
            const settingKey = customEvent.detail?.settingKey;
            if (!settingKey) {
                return;
            }

            this.refreshLiveDownloadLinks(modalElement, program);
            this.applyLiveVideoSettings(modalElement, program);

            if (settingKey === "settings_general_3") {
                if (program.settings.autoSlideshow) {
                    checkAndPlayVideoOrStartTimer();
                } else {
                    stopActivePlayback(false);
                    Array.from(sliderControls.children).forEach((button) => {
                        (button as HTMLElement).style.setProperty("--progress", "0");
                    });
                }
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            queueSliderRealign();
        });

        const cleanup = () => {
            clearTimeout(slideTimer);
            clearTimeout(realignTimeout);
            stopActivePlayback(true);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener(this.settingsChangedEvent, handleSettingsChanged as EventListener);
            modalElement.removeEventListener(this.expandTransitionStartEvent, handleExpandTransitionStart as EventListener);
            modalElement.removeEventListener(this.expandTransitionEndEvent, handleExpandTransitionEnd as EventListener);
            resizeObserver.disconnect();
            observer.disconnect();
        };

        const observer = new MutationObserver(() => {
            if (!document.body.contains(modalElement)) {
                cleanup();
            }
        });

        updateSliderPosition(false);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener(this.settingsChangedEvent, handleSettingsChanged as EventListener);
        modalElement.addEventListener(this.expandTransitionStartEvent, handleExpandTransitionStart as EventListener);
        modalElement.addEventListener(this.expandTransitionEndEvent, handleExpandTransitionEnd as EventListener);
        resizeObserver.observe(sliderContainer);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    private initMediaModal(modalElement: HTMLElement, scannerResult: MediaScanResult, program: Program): void {
        this.initMediaModalActions(modalElement, program);
        this.refreshLiveDownloadLinks(modalElement, program);
        this.applyLiveVideoSettings(modalElement, program);
        if (modalElement.querySelector(".slider")) {
            this.initSlider(modalElement, scannerResult.selectedSliderIndex, program);
        }
    }

    private showScannerResult(scannerResult: MediaScanResult, program: Program): void {
        this.displayModal(
            scannerResult,
            this.buildMediaHeading(scannerResult.userLink, scannerResult.userName),
            `${this.modalBodyStyleReset};text-align:center`,
            [{ active: true, text: localize("c") }],
            (_modal, el) => {
                this.initMediaModal(el as HTMLElement, scannerResult, program);
            }
        );
    }

    private openUtilityModal(program: Program, body: string): void {
        this.openModal({
            heading: this.buildUtilityHeading(program),
            body,
            bodyStyle: this.utilityBodyStyle,
            buttonList: [{ active: true, text: "Ok" }],
            callback: (_modal, el) => {
                el.querySelector(`.${uiClasses.settings}`).addEventListener("click", () => {
                    this.handleSettingsButtonClick(program);
                });
            }
        });
    }

    private initMediaModalActions(modalElement: HTMLElement, program: Program): void {
        const settingsButton = modalElement.querySelector(`.${uiClasses.settings}`) as HTMLElement | null;
        settingsButton?.addEventListener("click", () => {
            this.handleSettingsButtonClick(program, modalElement);
        });

        const expandButton = modalElement.querySelector(`.${this.expandButtonClass}`) as HTMLButtonElement | null;
        const modalWindow = modalElement.querySelector(`.${uiClasses.modal}`) as HTMLElement | null;
        let expandAnimations: Animation[] = [];
        if (!expandButton || !modalWindow) {
            return;
        }

        const playFlipAnimation = (
            element: HTMLElement | null,
            firstRect: DOMRect | undefined,
            lastRect: DOMRect | undefined
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
                    transform: `translate(${translateX}px,${translateY}px) scale(${scaleX},${scaleY})`
                },
                {
                    transformOrigin: "top center",
                    transform: "translate(0,0) scale(1,1)"
                }
            ], {
                duration: 280,
                easing: "cubic-bezier(.22,.61,.36,1)",
                fill: "both"
            });
        };

        const applyExpandState = (expanded: boolean) => {
            modalWindow.classList.toggle("instg-media-expanded", expanded);
            expandButton.classList.toggle("active", expanded);
            expandButton.setAttribute("aria-pressed", String(expanded));
            expandButton.setAttribute("title", expanded ? "Kleiner anzeigen" : "Grosser anzeigen");
        };

        const animateExpandState = (expanded: boolean) => {
            expandAnimations.forEach((animation) => animation.cancel());
            expandAnimations = [];

            const sliderContainer = modalWindow.querySelector(".slider-container") as HTMLElement | null;
            const sliderTrack = modalWindow.querySelector(".slider") as HTMLElement | null;
            const slides = Array.from(modalWindow.querySelectorAll<HTMLElement>(".slide"));
            const activeSlideIndex = Number((modalElement.querySelector(".slider-controls button.active") as HTMLElement | null)?.dataset.index || "0");
            const activeSlide = slides[activeSlideIndex] || slides[0] || null;
            const activeMedia = activeSlide?.querySelector<HTMLElement>("img,video") || null;

            const firstModalRect = modalWindow.getBoundingClientRect();

            const previousModalTransition = modalWindow.style.transition;
            const previousContainerTransition = sliderContainer?.style.transition ?? "";
            const previousTrackTransition = sliderTrack?.style.transition ?? "";
            const previousMediaTransition = activeMedia?.style.transition ?? "";

            modalWindow.style.transition = "none";
            if (sliderContainer) {
                sliderContainer.style.transition = "none";
            }
            if (sliderTrack) {
                sliderTrack.style.transition = "none";
            }
            if (activeMedia) {
                activeMedia.style.transition = "none";
            }

            modalElement.dispatchEvent(new CustomEvent(this.expandTransitionStartEvent, {
                detail: { expanded }
            }));
            applyExpandState(expanded);

            const lastModalRect = modalWindow.getBoundingClientRect();

            const restoreTransitions = () => {
                modalWindow.style.transition = previousModalTransition;
                if (sliderContainer) {
                    sliderContainer.style.transition = previousContainerTransition;
                }
                if (sliderTrack) {
                    sliderTrack.style.transition = previousTrackTransition;
                }
                if (activeMedia) {
                    activeMedia.style.transition = previousMediaTransition;
                }
            };

            const finish = () => {
                restoreTransitions();
                modalElement.dispatchEvent(new CustomEvent(this.expandTransitionEndEvent, {
                    detail: { expanded }
                }));
            };

            const animations = [
                playFlipAnimation(modalWindow, firstModalRect, lastModalRect),
            ].filter((animation): animation is Animation => Boolean(animation));

            if (animations.length === 0) {
                finish();
                return;
            }

            expandAnimations = animations;
            let settledAnimations = 0;
            let finalized = false;
            const settle = () => {
                settledAnimations += 1;
                if (!finalized && settledAnimations >= animations.length) {
                    finalized = true;
                    expandAnimations = [];
                    finish();
                }
            };

            animations.forEach((animation) => {
                animation.addEventListener("finish", settle, { once: true });
                animation.addEventListener("cancel", settle, { once: true });
            });
        };

        applyExpandState(false);
        expandButton.addEventListener("click", () => {
            animateExpandState(!modalWindow.classList.contains("instg-media-expanded"));
        });
    }

    /**
     * Handles the click event for the settings button.
     * It constructs the settings modal dynamically and opens it.
     * @param program The program object that contains the configuration and context.
     */
    public handleSettingsButtonClick(program: Program, sourceModalElement?: HTMLElement): void {
        // Utility function to create elements
        const createElement = (tag, className = '', attributes = {}, str = '') => {
            const el = document.createElement(tag);
            if (className) el.className = className;
            Object.keys(attributes).forEach(attr => el.setAttribute(attr, attributes[attr]));
            if (str) el.innerHTML = str;
            return el;
        };

        // Function to create a settings list group item
        const createListGroupItem = ({ id, title, description, largeInput }: MediaScannerSettingConfig) => {
            const item = createElement('div', 'si');
            const row = createElement('div', 'sr');
            const col = createElement('div', 'sgw');
            const domId = this.toDomSettingId(id);
            const localizedTitle = localize(title);
            const localizedDescription = localize(description);
            col.appendChild(createElement('strong', 'mb-0', {}, localizedTitle));
            if (localizedDescription) col.appendChild(createElement('p', 'sm mb-0', {}, localizedDescription));

            const colAuto = createElement('div', 'se');
            const label = createElement('label', 'slideon');
            const input = createElement('input', '', { type: 'checkbox', id: domId });
            const span = createElement('span', 'slideon-slider');
            label.appendChild(input);
            label.appendChild(span);
            colAuto.appendChild(label);

            if (largeInput) {
                // Create and add a paragraph to the new div
                const div = createElement(
                    'div',
                    'sf',
                    {},
                    `<strong>${localizedTitle}</strong>
                     <p class="sm smi mb-0">${localizedDescription}</p>
                     <input type="text" class="fi" id="${domId}" placeholder="${localizedTitle}">
                     <button type="submit" class="${uiClasses.btn} ${uiClasses.btnPrimary} mt-2" id="${this.saveFilenameButtonId}">${localize("s")}</button>`
                );

                row.appendChild(div);
            } else {
                row.appendChild(col);
                row.appendChild(colAuto);
            }
            item.appendChild(row);

            return item;
        };

        const container = createElement('div', 'sg');
        const content = createElement('div', 'sy');
        const navTabs = createElement('div', 'st', { id: 'nav-tab', role: 'tablist' });

        // Setting up tab buttons and panes for the modal
        navTabs.appendChild(createElement('button', 'tb active', {
            id: 'nav-general-tab', 'data-toggle': 'tab', 'data-target': '#nav-general', type: 'button', role: 'tab',
            'aria-controls': 'nav-general', 'aria-selected': 'true'
        }, `${localize("ms.g")}`));
        navTabs.appendChild(createElement('button', 'tb', {
            id: 'nav-stories-tab', 'data-toggle': 'tab', 'data-target': '#nav-stories', type: 'button', role: 'tab',
            'aria-controls': 'nav-stories', 'aria-selected': 'false'
        }, 'Stories'));

        const tabContent = createElement('div', 'tc', { id: 'nav-tabContent' });
        const generalPane = createElement('div', 'tp fade active show', { id: 'nav-general', role: 'tabpanel', 'aria-labelledby': 'nav-general-tab' });
        const storiesPane = createElement('div', 'tp fade', { id: 'nav-stories', role: 'tabpanel', 'aria-labelledby': 'nav-stories-tab' });

        SETTINGS_CONFIG.forEach((setting) => {
            const pane = setting.pane === "general" ? generalPane : storiesPane;
            pane.appendChild(createListGroupItem(setting));
        });

        // Append all the elements to form the modal content
        tabContent.appendChild(generalPane);
        tabContent.appendChild(storiesPane);
        content.appendChild(navTabs);
        content.appendChild(tabContent);
        content.appendChild(createElement('div', 'sw mt-3', {}, localize("ms.a")));
        container.appendChild(content);

        const mediaVideos = sourceModalElement
            ? Array.from(sourceModalElement.querySelectorAll<HTMLVideoElement>("video"))
            : [];
        const pausedForSettings = mediaVideos
            .filter((video) => !video.paused && !video.ended)
            .map((video) => {
                video.pause();
                return video;
            });

        // Open the modal with the constructed settings content
        this.openModal({
            heading: this.buildSettingsHeading(program),
            body: container,
            buttonList: [{ active: true, text: localize("c") }],
            onClose: () => {
                pausedForSettings.forEach((video) => {
                    void video.play().catch(() => undefined);
                });
            },
            callback: (_modal, el) => {
                // Initialize listeners once the modal is open
                this.initModalSettingsListeners(el as HTMLElement, program);
            }
        });
    }

    /**
     * Handles different URL patterns based on the current path and executes the appropriate scanner.
     * It checks the URL to determine whether to scan stories, profiles, or posts, and processes accordingly.
     * @param program The program object that contains the configuration and context.
     */
    private async handleURLPatterns(program: Program): Promise<void> {
        if (!program.hostname.includes("instagram.com")) {
            this.openUtilityModal(program, localize("a.wo"));
            return;
        }

        const scannerClass = this.resolveScannerClass(program);
        if (!scannerClass) {
            return;
        }

        const loadingModal = this.createLoadingModal(program);
        await loadingModal.open();

        try {
            const scanner = new scannerClass();
            if (program.DEVELOPMENT) {
                console.log(`${this.getName()}()`, `Execute module ${scanner.getName()}`);
            }
            const scannerResult = await scanner.execute(program);
            await loadingModal.close();

            if (scannerResult?.found) {
                this.showScannerResult(scannerResult, program);
            } else {
                this.openUtilityModal(program, this.buildNotFoundBody());
            }
        } catch (error) {
            await loadingModal.close();
            console.error(`Error executing scanner ${scannerClass.name}:`, error);
        }
    }

    /**
     * Check if the modal is currently open on the page.
     * This method checks for the presence of specific CSS classes that indicate the modal's visibility and open state.
     * @param program The program object containing context and configuration settings.
     * @returns {boolean} True if the modal is open, otherwise false.
     */
    private isModalOpen(): boolean {
        return !!document.querySelector(`div.${uiClasses.modalOverlay}.${uiClasses.modalVisible}.${uiClasses.modalShow}`);
    }

    /** 
     * Removes style tags from the document by their specified IDs.
     * This method is used to clean up and avoid duplicate style tags that may have been added dynamically.
     * @param idsToRemove An array of style tag IDs to be removed from the document.
     */
    private removeStyleTagsWithIDs(idsToRemove: string[]): void {
        idsToRemove.forEach(id => {
            const styleTag = document.getElementById(id);
            if (styleTag) {
                styleTag.remove();
            }
        });
    }

    /** 
     * Applies a shaking animation to the modal window to indicate an error or attention.
     * The animation runs for 0.25 seconds and then stops after 1 second.
     * @param modalSelector The CSS selector of the modal element to shake.
     */
    private shakeModal(modalSelector: string): void {
        const modal = document.querySelector("." + modalSelector) as HTMLElement;
        if (modal) {
            // Apply the shaking animation to the modal
            modal.style.animation = "horizontal-shaking 0.25s linear infinite";
            // Remove the animation after 1 second to reset the modal state
            setTimeout(() => modal.style.animation = null, 1000);
        }
    }

    /** 
     * Updates the style of the input button, changing its text and class based on the current state.
     * This is typically used to toggle between a "save" and "saved" state for buttons.
     * @param button The button element to update.
     * @param text The text to display on the button.
     * @param oldClass The class name to remove from the button.
     * @param newClass The class name to add to the button.
     */
    private updateInputButtonStyle(button: HTMLElement, text: string, oldClass: string, newClass: string) {
        // Update the button's text content
        button.textContent = localize(text);

        // Toggle the button's classes between "saved" and "save" state
        if (button.classList.contains(newClass)) {
            button.classList.remove(newClass);
            button.classList.add(oldClass);
        } else {
            button.classList.remove(oldClass);
            button.classList.add(newClass);
        }
    }

    /** 
     * Main execution logic for the MediaScanner module.
     * This method is responsible for initializing styles, checking for an open modal, 
     * and handling different URL patterns to trigger the appropriate scanner.
     * @param program The program object containing the configuration and context.
     */
    public async execute(program: Program): Promise<void> {
        if (program.DEVELOPMENT) {
            console.log(`${this.getName()}()`, "Starts");
        }
        try {
            // Check if the modal is already open to prevent multiple modals from being triggered
            if (this.isModalOpen()) {
                this.shakeModal(uiClasses.modal); // If modal is open, shake it to get attention
                return;
            }

            // Initialize necessary styles for the page
            this.initializeStyles(program);

            // Handle different URL patterns and trigger the appropriate scanner
            await this.handleURLPatterns(program);
        } catch (e) {
            // Log any errors that occur during execution
            console.error(`${this.getName()}()`, `[${program.NAME}] ${program.VERSION}`, e);
        }
    }
}
