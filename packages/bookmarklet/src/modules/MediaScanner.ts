import { Program } from "../App";
import { h } from "preact";
import { Module, NO_TARGET_FOUND } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { Modal, ModalContent } from "../components/Modal";
import {
    createMediaViewerStore,
    createUtilityViewerStore,
    LoadingBody,
    NotFoundBody,
    ReactiveMediaModalBody,
    ReactiveMediaModalHeading,
    ReactiveUtilityModalBody,
    ReactiveUtilityModalHeading,
    SettingsConfig,
    UtilityMessageBody,
    UtilityModalHeading
} from "../components/mediaModalApp";
import { cssCarouselSlider } from "../components/sliderStyles";
import { cssGeneral, cssSlideOn } from "../components/generalStyles";
import { uiClasses } from "../components/uiTokens";
import { FeedScanner } from "./FeedScanner";
import { PostAndReelScanner } from "./PostAndReelScanner";
import { ProfileScanner } from "./ProfileScanner";
import { ReelsScanner } from "./ReelsScanner";
import { StoriesScanner } from "./StoriesScanner";
import localize from "../helpers/localize";

type ScannerClass =
    | typeof StoriesScanner
    | typeof ProfileScanner
    | typeof FeedScanner
    | typeof PostAndReelScanner
    | typeof ReelsScanner;

const SETTINGS_CONFIG: SettingsConfig[] = [
    { id: "g1", pane: "general", title: "msg.t1", description: "msg.d1" },
    { id: "g2", pane: "general", title: "msg.t2", description: "msg.d2" },
    { id: "g3", pane: "general", title: "msg.t3", description: "msg.d3" },
    { id: "g5", pane: "general", title: "msg.t5", description: "msg.d5" },
    { id: "g6", pane: "general", title: "msg.t6", description: "msg.d6" },
    { id: "g4", pane: "general", title: "msg.t4", description: "msg.d4", largeInput: true },
    { id: "s1", pane: "stories", title: "mss.t1", description: "mss.d1" },
    { id: "s2", pane: "stories", title: "mss.t2", description: "mss.d2" },
    { id: "s3", pane: "stories", title: "mss.t3", description: "mss.d3" },
];

const SETTINGS_PROGRAM_KEYS = {
    g1: "showAds",
    g2: "openInNewTab",
    g3: "autoSlideshow",
    g4: "formattedFilenameInput",
    g5: "videosMuted",
    g6: "autoExpand",
    s1: "storiesMuted",
    s3: "noMultiStories",
} as const;

const SETTINGS_ICON_HTML = "&#9881;";
const EXPAND_ICON_HTML = "&#9974;";
const CLOSE_TEXT = localize("c");
const SETTINGS_TITLE = localize("ms.t");
const WRONG_HOST_TEXT = localize("a.wo");
const UNSUPPORTED_MEDIA_TEXT = localize("a.ie");
const NOT_FOUND_TEXT = localize("a.nf");

/**
 * MediaScanner is a module responsible for handling various media scanning tasks,
 * including managing settings, adding necessary styles to the page, and interacting with modals.
 */
export class MediaScanner implements Module {
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

    private openModal(config: ConstructorParameters<typeof Modal>[0]): Modal {
        const modal = new Modal(config);
        void modal.open();
        return modal;
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
     * Initializes the necessary styles by appending them to the document.
     * It removes any previously added styles to avoid duplicates.
     * @param program The program object that contains the configuration and context.
     */
    private initializeStyles(program: Program): void {
        const styleId = `${program.DOM_PREFIX}-css`;
        document.getElementById(styleId)?.remove();
        const styleElement = document.createElement("style");
        styleElement.id = styleId;
        styleElement.textContent = cssGeneral + cssSlideOn + cssCarouselSlider;
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
    private createLoadingModal(program: Program): Modal {
        return new Modal({
            heading: h(UtilityModalHeading, {
                version: program.VERSION,
                settingsButton: undefined
            }),
            body: h(LoadingBody, {}),
            bodyStyle: "padding:0!important",
            buttonList: [],
            closeOnOverlayClick: false,
        });
    }

    /**
     * "No target found." means the scanner couldn't locate any post/story/
     * profile structure on the page at all -- the user is likely just on the
     * wrong kind of page, so the "did you open a post?" hint is accurate.
     * Any other errorMessage means a target WAS found but fetching/processing
     * its data failed (e.g. an Instagram API error) -- showing the same
     * "wrong page" hint there is misleading, so use a distinct message.
     */
    private buildNotFoundBody(errorMessage?: string): ModalContent {
        if (errorMessage && errorMessage !== NO_TARGET_FOUND) {
            console.info(`[${this.getName()}] Instagram returned an error:`, errorMessage);
            return UNSUPPORTED_MEDIA_TEXT;
        }
        return h(NotFoundBody, {
            message: NOT_FOUND_TEXT,
            exampleUrl: "https://www.instagram.com/p/CIGrv1VMBkS/",
            linkRel: "noopener noreferrer"
        });
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

    private showScannerResult(scannerResult: MediaScanResult, program: Program): void {
        const viewerStore = createMediaViewerStore(scannerResult.selectedSliderIndex);
        this.openModal({
            body: h(ReactiveMediaModalBody, {
                onSettingChange: (settingKey: string, value: string | boolean) => {
                    this.syncProgramSetting(program, settingKey, value);
                },
                program,
                settings: SETTINGS_CONFIG,
                slides: scannerResult.slides || [],
                store: viewerStore
            }),
            heading: h(ReactiveMediaModalHeading, {
                expandIcon: EXPAND_ICON_HTML,
                settingsIcon: SETTINGS_ICON_HTML,
                settingsTitle: SETTINGS_TITLE,
                store: viewerStore,
                userLink: scannerResult.userLink,
                userName: scannerResult.userName,
                version: program.VERSION
            }),
            bodyStyle: "padding:0!important;text-align:center",
            buttonList: [{ active: true, text: CLOSE_TEXT }]
        });
    }

    private openUtilityModal(program: Program, body: ModalContent): void {
        const utilityStore = createUtilityViewerStore();
        this.openModal({
            heading: h(ReactiveUtilityModalHeading, {
                programVersion: program.VERSION,
                settingsIcon: SETTINGS_ICON_HTML,
                settingsTitle: SETTINGS_TITLE,
                store: utilityStore
            }),
            body: h(ReactiveUtilityModalBody, {
                body: typeof body === "string" ? h(UtilityMessageBody, { body }) : body,
                onSettingChange: (settingKey: string, value: string | boolean) => {
                    this.syncProgramSetting(program, settingKey, value);
                },
                program,
                settings: SETTINGS_CONFIG,
                store: utilityStore
            }),
            bodyStyle: "text-align:center;padding:20px",
            buttonList: [{ active: true, text: "Ok" }]
        });
    }

    /**
     * Handles different URL patterns based on the current path and executes the appropriate scanner.
     * It checks the URL to determine whether to scan stories, profiles, or posts, and processes accordingly.
     * @param program The program object that contains the configuration and context.
     */
    private async handleURLPatterns(program: Program): Promise<void> {
        if (!program.hostname.includes("instagram.com")) {
            this.openUtilityModal(program, WRONG_HOST_TEXT);
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
                this.openUtilityModal(program, this.buildNotFoundBody(scannerResult?.errorMessage));
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
        return !!document.querySelector(`div.${uiClasses.modalOverlay}.${uiClasses.modalVisible}`);
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
