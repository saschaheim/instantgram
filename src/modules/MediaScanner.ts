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

/**
 * MediaScanner is a module responsible for handling various media scanning tasks,
 * including managing settings, adding necessary styles to the page, and interacting with modals.
 */
export class MediaScanner implements Module {
    svgSettings: any = null;
    svgExpand: any = null;
    private readonly postExampleUrl = "https://www.instagram.com/p/CIGrv1VMBkS/";
    private readonly expandButtonClass = "instg-modal-action";
    private readonly settingsChangedEvent = "instg:settings-change";

    private getStyleId(program: Program, suffix: string): string {
        return `${program.DOM_PREFIX}-${suffix}`;
    }

    private syncProgramSetting(program: Program, settingKey: string, value: string | boolean): void {
        switch (settingKey) {
            case "settings_general_1":
                program.settings.showAds = Boolean(value);
                break;
            case "settings_general_2":
                program.settings.openInNewTab = Boolean(value);
                break;
            case "settings_general_3":
                program.settings.autoSlideshow = Boolean(value);
                break;
            case "settings_general_4":
                program.settings.formattedFilenameInput = String(value);
                break;
            case "settings_stories_1":
                program.settings.storiesMuted = Boolean(value);
                break;
            case "settings_stories_3":
                program.settings.noMultiStories = Boolean(value);
                break;
        }
    }

    private emitSettingsChanged(settingKey: string, value: string | boolean): void {
        document.dispatchEvent(new CustomEvent(this.settingsChangedEvent, {
            detail: { settingKey, value }
        }));
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
                anchor.rel = "noopener noreferrer";
            } else {
                anchor.removeAttribute("target");
                anchor.removeAttribute("rel");
            }
        });
    }

    private applyLiveStorySettings(modalElement: HTMLElement, program: Program): void {
        modalElement.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
            video.muted = program.settings.storiesMuted;
            if (program.settings.storiesMuted) {
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

    /**
 * Constructor for initializing the settings button SVG icon.
 * This SVG represents a settings icon (gear) that will be used in the interface.
 */
    constructor() {
        // Define the SVG namespace
        const svgNS = "http://www.w3.org/2000/svg";

        // Create the SVG element and set its attributes
        this.svgSettings = document.createElementNS(svgNS, "svg");
        this.svgSettings.setAttribute("style", "margin-left: auto; margin-right:auto; display:block;");
        this.svgSettings.setAttribute("aria-label", "Optionen"); // Label for accessibility
        this.svgSettings.setAttribute("class", "x1lliihq x1n2onr6"); // Class for styling
        this.svgSettings.setAttribute("color", "rgb(255, 255, 255)"); // Color for the icon
        this.svgSettings.setAttribute("fill", "rgb(255, 255, 255)"); // Fill color
        this.svgSettings.setAttribute("height", "24"); // Height of the icon
        this.svgSettings.setAttribute("role", "img"); // Role of the element for accessibility
        this.svgSettings.setAttribute("viewBox", "0 0 24 24"); // Viewbox for the SVG scaling
        this.svgSettings.setAttribute("width", "24"); // Width of the icon

        // Add a title to the SVG for accessibility
        const title = document.createElementNS(svgNS, "title");
        title.textContent = "Optionen";
        this.svgSettings.appendChild(title);

        // Create the circle part of the gear icon
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "12"); // Center X
        circle.setAttribute("cy", "12"); // Center Y
        circle.setAttribute("fill", "none"); // No fill color for the circle
        circle.setAttribute("r", "8.635"); // Radius of the circle
        circle.setAttribute("stroke", "currentColor"); // Color of the stroke
        circle.setAttribute("stroke-linecap", "round"); // Round stroke caps
        circle.setAttribute("stroke-linejoin", "round"); // Round stroke joins
        circle.setAttribute("stroke-width", "2"); // Stroke width
        this.svgSettings.appendChild(circle);

        // Create the path element that completes the gear icon
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", "M14.232 3.656a1.269 1.269 0 0 1-.796-.66L12.93 2h-1.86l-.505.996a1.269 1.269 0 0 1-.796.66m-.001 16.688a1.269 1.269 0 0 1 .796.66l.505.996h1.862l.505-.996a1.269 1.269 0 0 1 .796-.66M3.656 9.768a1.269 1.269 0 0 1-.66.796L2 11.07v1.862l.996.505a1.269 1.269 0 0 1 .66.796m16.688-.001a1.269 1.269 0 0 1 .66-.796L22 12.93v-1.86l-.996-.505a1.269 1.269 0 0 1-.66-.796M7.678 4.522a1.269 1.269 0 0 1-1.03.096l-1.06-.348L4.27 5.587l.348 1.062a1.269 1.269 0 0 1-.096 1.03m11.8 11.799a1.269 1.269 0 0 1 1.03-.096l1.06.348 1.318-1.317-.348-1.062a1.269 1.269 0 0 1 .096-1.03m-14.956.001a1.269 1.269 0 0 1 .096 1.03l-.348 1.06 1.317 1.318 1.062-.348a1.269 1.269 0 0 1 1.03.096m11.799-11.8a1.269 1.269 0 0 1-.096-1.03l.348-1.06-1.317-1.318-1.062.348a1.269 1.269 0 0 1-1.03-.096");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor"); // Stroke color
        path.setAttribute("stroke-linejoin", "round"); // Round stroke joins
        path.setAttribute("stroke-width", "2"); // Stroke width
        this.svgSettings.appendChild(path);

        this.svgExpand = document.createElementNS(svgNS, "svg");
        this.svgExpand.setAttribute("style", "margin-left: auto; margin-right:auto; display:block;");
        this.svgExpand.setAttribute("aria-label", "Groser anzeigen");
        this.svgExpand.setAttribute("class", "x1lliihq x1n2onr6");
        this.svgExpand.setAttribute("color", "rgb(255, 255, 255)");
        this.svgExpand.setAttribute("fill", "none");
        this.svgExpand.setAttribute("height", "24");
        this.svgExpand.setAttribute("role", "img");
        this.svgExpand.setAttribute("viewBox", "0 0 24 24");
        this.svgExpand.setAttribute("width", "24");

        const expandTitle = document.createElementNS(svgNS, "title");
        expandTitle.textContent = "Groser anzeigen";
        this.svgExpand.appendChild(expandTitle);

        const expandPath = document.createElementNS(svgNS, "path");
        expandPath.setAttribute("d", "M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M9 3 3 9M15 3l6 6M21 15l-6 6M3 15l6 6");
        expandPath.setAttribute("stroke", "currentColor");
        expandPath.setAttribute("stroke-linecap", "round");
        expandPath.setAttribute("stroke-linejoin", "round");
        expandPath.setAttribute("stroke-width", "2");
        this.svgExpand.appendChild(expandPath);
    }

    /**
     * Initializes listeners for the modal settings.
     * This method adds event listeners for tab switching, checkbox updates, and text input handling.
     * @param el The modal element that contains the settings.
     * @param program The program object that contains the configuration and context.
     */
    private initModalSettingsListeners(el: HTMLElement, program: Program) {
        const myTabs = document.querySelectorAll("div.nav-tabs > button.nav-link");
        const panes = document.querySelectorAll(".tab-pane");

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
        const inputFileFormat = el.querySelector<HTMLInputElement>('#settings-general-4');
        if (inputFileFormat) {
            const inputKey = `${program.STORAGE_NAME}_settings_general_4`;
            inputFileFormat.value = localStorage.getItem(inputKey) || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}";

            const saveFilenameFormatBtn = el.querySelector<HTMLElement>(`#settings-general-btn-4`);
            saveFilenameFormatBtn.addEventListener("click", (event: Event) => {
                event.preventDefault();
                localStorage.setItem(inputKey, inputFileFormat.value); // Save input value to localStorage
                this.syncProgramSetting(program, "settings_general_4", inputFileFormat.value);
                this.emitSettingsChanged("settings_general_4", inputFileFormat.value);
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
        new Modal({
            heading: [heading],
            body: [result.modalBody],
            bodyStyle: bodyStyle,
            buttonList: buttonList,
            callback: callback,
        }).open();
    }

    private createLoadingModal(program: Program): Modal {
        return new Modal({
            heading: [
                `<h5>
                    <span class="header-text-left">${logo}</span>
                    <span class="header-text-right">v${program.VERSION}</span>
                </h5>`
            ],
            body: [
                `<div class="${uiClasses.loading}">
                    <div class="${uiClasses.loadingSpinner}" aria-hidden="true"></div>
                    <div class="${uiClasses.loadingText}">${localize("l")}</div>
                </div>`
            ],
            bodyStyle: "padding:0!important",
            buttonList: [],
            closeOnOverlayClick: false,
        });
    }

    private buildNotFoundBody(): string {
        return `${localize("a.nf")}<br/><div style="text-align:center"><a style="color:black" href="${this.postExampleUrl}" target="_blank" rel="noopener noreferrer">${this.postExampleUrl}</a></div>`;
    }

    private debugStoryLog(program: Program, step: string): void {
        if (window.location.pathname.startsWith("/stories/")) {
            console.info(`[${program.NAME}] story debug: ${step}`);
        }
    }

    private buildDebugBody(result?: MediaScanResult | null): string {
        const debugTrail = Array.isArray((result?.error as { debugTrail?: unknown })?.debugTrail)
            ? ((result?.error as { debugTrail?: string[] }).debugTrail || [])
            : [];
        const lines = [
            result?.errorMessage ? `errorMessage: ${result.errorMessage}` : "errorMessage: <empty>",
            ...debugTrail
        ];
        return `<div style="text-align:left;padding:16px 20px;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;">${lines.join("\n")}</div>`;
    }

    private initMediaModalActions(modalElement: HTMLElement, program: Program): void {
        const settingsButton = modalElement.querySelector(`.${uiClasses.settings}`) as HTMLElement | null;
        settingsButton?.addEventListener("click", () => {
            this.handleSettingsButtonClick(program);
        });

        const expandButton = modalElement.querySelector(`.${this.expandButtonClass}`) as HTMLButtonElement | null;
        const modalWindow = modalElement.querySelector(`.${uiClasses.modal}`) as HTMLElement | null;
        if (!expandButton || !modalWindow) {
            return;
        }

        const updateExpandState = (expanded: boolean) => {
            modalWindow.classList.toggle("instg-media-expanded", expanded);
            expandButton.classList.toggle("active", expanded);
            expandButton.setAttribute("aria-pressed", String(expanded));
            expandButton.setAttribute("title", expanded ? "Kleiner anzeigen" : "Grosser anzeigen");
            modalElement.dispatchEvent(new CustomEvent("instg:media-expand-toggle", {
                detail: { expanded }
            }));
        };

        updateExpandState(false);
        expandButton.addEventListener("click", () => {
            updateExpandState(!modalWindow.classList.contains("instg-media-expanded"));
        });
    }

    /**
     * Handles the click event for the settings button.
     * It constructs the settings modal dynamically and opens it.
     * @param program The program object that contains the configuration and context.
     */
    public handleSettingsButtonClick(program: Program): void {
        // Utility function to create elements
        const createElement = (tag, className = '', attributes = {}, str = '') => {
            const el = document.createElement(tag);
            if (className) el.className = className;
            Object.keys(attributes).forEach(attr => el.setAttribute(attr, attributes[attr]));
            if (str) el.innerHTML = str;
            return el;
        };

        // Function to create a settings list group item
        const createListGroupItem = (title, description, settingsName, isLargeInput) => {
            const item = createElement('div', 'list-group-item');
            const row = createElement('div', 'row align-items-center');
            const col = createElement('div', 'col pr-0');
            col.appendChild(createElement('strong', 'mb-0', {}, title));
            if (description) col.appendChild(createElement('p', 'text-muted mb-0', {}, description));

            const colAuto = createElement('div', 'col-auto');
            const label = createElement('label', 'slideon');
            const input = createElement('input', '', { type: 'checkbox', id: `settings-${settingsName}` });
            const span = createElement('span', 'slideon-slider');
            label.appendChild(input);
            label.appendChild(span);
            colAuto.appendChild(label);

            if (isLargeInput) {
                // Create and add a paragraph to the new div
                const div = createElement(
                    'div',
                    'form-group',
                    { style: 'display: flex; flex-direction: column; align-items: flex-start;' },
                    `<strong class="col pr-0">${title}</strong>
                     <p class="text-muted ml-15 mb-0">${description}</p>
                     <input type="text" class="form-control ml-15 mt-1 w94" id="settings-${settingsName}" placeholder="${title}">
                     <button type="submit" class="${uiClasses.btn} ${uiClasses.btnPrimary} mb-2 mt-2" id="settings-general-btn-4" style="align-self: flex-end; margin-right: 12px;">${localize("s")}</button>`
                );

                row.appendChild(div);
            } else {
                row.appendChild(col);
                row.appendChild(colAuto);
            }
            item.appendChild(row);

            return item;
        };

        const container = createElement('div', 'container');
        const row = createElement('div', 'row justify-content-center');
        const col = createElement('div', 'col-12 col-lg-10 col-xl-8 mx-auto');
        const my4 = createElement('div', 'my-4');
        const nav = createElement('nav');
        const navTabs = createElement('div', 'nav nav-tabs', { id: 'nav-tab', role: 'tablist' });

        // Setting up tab buttons and panes for the modal
        navTabs.appendChild(createElement('button', 'nav-link active', {
            id: 'nav-general-tab', 'data-toggle': 'tab', 'data-target': '#nav-general', type: 'button', role: 'tab',
            'aria-controls': 'nav-general', 'aria-selected': 'true'
        }, `${localize("ms.g")}`));
        navTabs.appendChild(createElement('button', 'nav-link', {
            id: 'nav-stories-tab', 'data-toggle': 'tab', 'data-target': '#nav-stories', type: 'button', role: 'tab',
            'aria-controls': 'nav-stories', 'aria-selected': 'false'
        }, 'Stories'));

        const tabContent = createElement('div', 'tab-content', { id: 'nav-tabContent' });
        const generalPane = createElement('div', 'tab-pane fade active show', { id: 'nav-general', role: 'tabpanel', 'aria-labelledby': 'nav-general-tab' });
        const storiesPane = createElement('div', 'tab-pane fade', { id: 'nav-stories', role: 'tabpanel', 'aria-labelledby': 'nav-stories-tab' });

        // Adding settings items to both general and stories panes
        const items = [
            { title: 'msg.t1', description: 'msg.d1', settingsName: 'general-1' },
            { title: 'msg.t2', description: 'msg.d2', settingsName: 'general-2' },
            { title: 'msg.t3', description: 'msg.d3', settingsName: 'general-3' },
            { title: 'msg.t4', description: 'msg.d4', settingsName: 'general-4', isLargeInput: true },
            { title: 'mss.t1', description: 'mss.d1', settingsName: 'stories-1' },
            { title: 'mss.t2', description: 'mss.d2', settingsName: 'stories-2' },
            { title: 'mss.t3', description: 'mss.d3', settingsName: 'stories-3' },
        ];

        // Loop through each item and add to the appropriate pane
        items.forEach((item) => {
            const pane = item.settingsName.startsWith("general") ? generalPane : storiesPane;
            pane.appendChild(createListGroupItem(localize(item.title), localize(item.description), item.settingsName, item.isLargeInput));
        });

        // Append all the elements to form the modal content
        tabContent.appendChild(generalPane);
        tabContent.appendChild(storiesPane);
        nav.appendChild(navTabs);
        my4.appendChild(nav);
        my4.appendChild(tabContent);
        my4.appendChild(createElement('div', 'alert alert-warning mt-3', {}, localize("ms.a")));
        col.appendChild(my4);
        row.appendChild(col);
        container.appendChild(row);

        // Open the modal with the constructed settings content
        new Modal({
            heading: [
                `<h5>
                    <span class="header-text-left">${logo}</span>
                    <span class="header-text-middle">${localize("ms.t")}</span>
                    <span class="header-text-right" style="margin-right: 0">v${program.VERSION}</span>
                </h5>`
            ],
            body: [container],
            bodyStyle: null,
            buttonList: [{ active: true, text: localize("c") }],
            callback: (_modal, el) => {
                // Initialize listeners once the modal is open
                this.initModalSettingsListeners(el as HTMLElement, program);
            }
        }).open();
    }

    /**
     * Handles different URL patterns based on the current path and executes the appropriate scanner.
     * It checks the URL to determine whether to scan stories, profiles, or posts, and processes accordingly.
     * @param program The program object that contains the configuration and context.
     */
    private async handleURLPatterns(program: Program): Promise<void> {
        // If the URL is not from Instagram, show a warning modal
        if (!program.hostname.includes("instagram.com")) {
            new Modal({
                heading: [
                    `<h5>
                        <span class="header-text-left">${logo}</span>
                        <span class="header-text-right">v${program.VERSION}<button class="${uiClasses.settings}" style="margin-left:10px">${this.svgSettings.outerHTML}</button></span>
                    </h5>`
                ],
                body: [localize("a.wo")],
                bodyStyle: "text-align:center;padding:20px",
                buttonList: [{ active: true, text: "Ok" }],
                callback: (_modal, el) => {
                    el.querySelector(`.${uiClasses.settings}`).addEventListener("click", () => {
                        this.handleSettingsButtonClick(program);
                    });
                }
            }).open();
            return;
        }

        // Define tests for different URL patterns and corresponding scanners
        const tests = [
            { regex: program.regexStoriesURI, scanner: StoriesScanner },
            { regex: program.regexProfilePath, scanner: ProfileScanner },
            { regex: program.regexRootPath, scanner: FeedScanner },
            { regex: program.regexPostPath, scanner: PostAndReelScanner },
            { regex: program.regexReelURI, scanner: PostAndReelScanner },
            { regex: program.regexReelsURI, scanner: ReelsScanner },
        ];

        // Loop through each test and execute the corresponding scanner based on the URL match
        for (const test of tests) {
            if (test.regex.test(window.location.pathname)) {
                this.debugStoryLog(program, `matched ${test.scanner.name}`);
                const loadingModal = this.createLoadingModal(program);
                await loadingModal.open();
                this.debugStoryLog(program, "loading modal opened");

                try {
                    const scanner = new test.scanner();
                    if (program.DEVELOPMENT) {
                        console.log(`${this.getName()}()`, `Execute module ${scanner.getName()}`);
                    }
                    this.debugStoryLog(program, `scanner execute start ${scanner.getName()}`);
                    const scannerResult = await scanner.execute(program);
                    this.debugStoryLog(program, `scanner execute end ${scanner.getName()} found=${scannerResult?.found ?? "null"}`);
                    await loadingModal.close();
                    this.debugStoryLog(program, "loading modal closed");
                    if (!scannerResult) {
                        this.debugStoryLog(program, "scannerResult null");
                        new Modal({
                            heading: [
                                `<h5>
                                    <span class="header-text-left">${logo}</span>
                                    <span class="header-text-right">v${program.VERSION}<button class="${uiClasses.settings}" style="margin-left:10px">${this.svgSettings.outerHTML}</button></span>
                                </h5>`
                            ],
                            body: [this.buildNotFoundBody()],
                            bodyStyle: "text-align:center;padding:20px",
                            buttonList: [{ active: true, text: "Ok" }],
                            callback: (_modal, el) => {
                                el.querySelector(`.${uiClasses.settings}`).addEventListener("click", () => {
                                    this.handleSettingsButtonClick(program);
                                });
                            }
                        }).open();
                    } else if (scannerResult.found) {
                        this.debugStoryLog(program, "opening result modal");
                        scannerResult.foundByModule = scanner.getName();
                        this.displayModal(scannerResult,
                            `<h5>
                                <span class="header-text-left">${logo}</span>
                                <span class="header-text-middle"><a href="${scannerResult.userLink}">@${scannerResult.userName}</a></span>
                                <span class="header-text-right"><button class="${this.expandButtonClass}" type="button" aria-pressed="false" title="Grosser anzeigen">${this.svgExpand.outerHTML}</button><button class="${uiClasses.settings}" type="button">${this.svgSettings.outerHTML}</button></span>
                            </h5>`,
                            "padding:0!important;text-align:center",
                            [{ active: true, text: localize("c") }],
                            (_modal, el) => {
                                const modalElement = el as HTMLElement;
                                this.initMediaModalActions(modalElement, program);
                                this.refreshLiveDownloadLinks(modalElement, program);
                                this.applyLiveStorySettings(modalElement, program);

                                if (modalElement.querySelector(".slider")) {
                                    const slider = modalElement.querySelector(".slider") as HTMLElement | null;
                                    const sliderContainer = modalElement.querySelector(".slider-container") as HTMLElement | null;
                                    const slides = Array.from(modalElement.querySelectorAll(".slide")) as HTMLElement[];
                                    const sliderControls = modalElement.querySelector(".slider-controls") as HTMLElement | null;
                                    const modalWindow = modalElement.querySelector(`.${uiClasses.modal}`) as HTMLElement | null;
                                    let sliderIndex = scannerResult.selectedSliderIndex;
                                    let slideTimer: ReturnType<typeof setTimeout> | undefined;
                                    let progressAnimationFrame: number | undefined;
                                    let isAdvancing = false;
                                    let realignTimeout: ReturnType<typeof setTimeout> | undefined;
                                    let playbackSession = 0;
                                    let isExpandTransitioning = false;

                                    if (!slider || !sliderContainer || !sliderControls || !modalWindow || slides.length === 0) {
                                        return;
                                    }

                                    // Attach event listeners to the slides
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

                                    // Update the position of the slider
                                    const updateSliderPosition = (resetTimer, immediate = false) => {
                                        const isFullscreen = document.fullscreenElement !== null;
                                        if (isFullscreen) return;
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
                                            (button as HTMLElement).style.setProperty("--progress", index === sliderIndex ? "0" : "0");
                                        });

                                        if (resetTimer) {
                                            clearTimeout(slideTimer);
                                            slideTimer = undefined;
                                        }
                                        const currentSlideHasVideo = Boolean(slides[sliderIndex]?.querySelector("video"));
                                        const shouldRunProgress = localStorage.getItem(`${program.STORAGE_NAME}_settings_general_3`) === "true"
                                            || currentSlideHasVideo;
                                        if (shouldRunProgress)
                                            checkAndPlayVideoOrStartTimer();
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

                                    // Play video or restart timer
                                    const checkAndPlayVideoOrStartTimer = () => {
                                        playbackSession += 1;
                                        const currentSession = playbackSession;
                                        const currentSlide = slides[sliderIndex];
                                        const currentButton = sliderControls.children[sliderIndex] as HTMLElement | undefined;
                                        const video = currentSlide.querySelector("video") as HTMLVideoElement | null;
                                        if (slides.length <= 1) {
                                            currentButton?.style.setProperty("--progress", "0");
                                            if (video) {
                                                video.onended = null;
                                                video.ontimeupdate = null;
                                                video.onseeking = null;
                                                video.onseeked = null;
                                                void video.play().catch(() => undefined);
                                            }
                                            return;
                                        }
                                        if (video) {
                                            const syncVideoProgress = () => {
                                                if (currentSession !== playbackSession || sliderIndex >= slides.length || slides[sliderIndex] !== currentSlide) {
                                                    return;
                                                }
                                                const duration = video.duration;
                                                const progress = duration && Number.isFinite(duration)
                                                    ? Math.max(0, Math.min(100, (video.currentTime / duration) * 100))
                                                    : 0;
                                                currentButton?.style.setProperty("--progress", progress.toFixed(2));
                                            };
                                            const updateVideoProgress = () => {
                                                if (currentSession !== playbackSession || sliderIndex >= slides.length || slides[sliderIndex] !== currentSlide) {
                                                    return;
                                                }
                                                syncVideoProgress();
                                                if (!video.paused && !video.ended) {
                                                    progressAnimationFrame = requestAnimationFrame(updateVideoProgress);
                                                }
                                            };
                                            video.onended = () => {
                                                if (currentSession === playbackSession) {
                                                    advanceSlide();
                                                }
                                            };
                                            video.ontimeupdate = syncVideoProgress;
                                            video.onseeking = syncVideoProgress;
                                            video.onseeked = syncVideoProgress;
                                            currentButton?.style.setProperty("--progress", "0");
                                            void video.play().catch(() => restartSlideTimer());
                                            progressAnimationFrame = requestAnimationFrame(updateVideoProgress);
                                        } else {
                                            restartSlideTimer(currentSession);
                                        }
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

                                    const stopActivePlayback = (reset) => {
                                        playbackSession += 1;
                                        clearTimeout(slideTimer);
                                        slideTimer = undefined;
                                        if (progressAnimationFrame) {
                                            cancelAnimationFrame(progressAnimationFrame);
                                            progressAnimationFrame = undefined;
                                        }
                                        slides.forEach(slide => {
                                            const video = slide.querySelector("video") as HTMLVideoElement | null;
                                            if (video) {
                                                video.onended = null;
                                                video.ontimeupdate = null;
                                                video.onseeking = null;
                                                video.onseeked = null;
                                                video.pause();
                                                if (reset)
                                                    video.currentTime = 0;
                                            }
                                        });
                                    };

                                    updateSliderPosition(false);

                                    // Function to handle fullscreen change
                                    const handleFullscreenChange = () => {
                                        const isFullscreen = document.fullscreenElement !== null;
                                        if (isFullscreen) {
                                            clearTimeout(slideTimer);
                                        }
                                    };

                                    const handleExpandToggle = () => {
                                        isExpandTransitioning = true;
                                    };

                                    const handleModalTransitionEnd = (event: TransitionEvent) => {
                                        if (event.target === modalWindow && event.propertyName === "width") {
                                            isExpandTransitioning = false;
                                            queueSliderRealign();
                                        }
                                    };

                                    const resizeObserver = new ResizeObserver(() => {
                                        queueSliderRealign();
                                    });

                                    const handleSettingsChanged = (event: Event) => {
                                        const customEvent = event as CustomEvent<{ settingKey: string; value: string | boolean; }>;
                                        const settingKey = customEvent.detail?.settingKey;
                                        if (!settingKey) {
                                            return;
                                        }

                                        this.refreshLiveDownloadLinks(modalElement, program);
                                        this.applyLiveStorySettings(modalElement, program);

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

                                    // Add fullscreen change event listener
                                    document.addEventListener('fullscreenchange', handleFullscreenChange);
                                    document.addEventListener(this.settingsChangedEvent, handleSettingsChanged as EventListener);
                                    modalElement.addEventListener("instg:media-expand-toggle", handleExpandToggle as EventListener);
                                    modalWindow.addEventListener("transitionend", handleModalTransitionEnd);
                                    resizeObserver.observe(sliderContainer);

                                    // Remove listeners and timers once the modal disappears.
                                    const cleanup = () => {
                                        clearTimeout(slideTimer);
                                        clearTimeout(realignTimeout);
                                        stopActivePlayback(true);
                                        document.removeEventListener('fullscreenchange', handleFullscreenChange);
                                        document.removeEventListener(this.settingsChangedEvent, handleSettingsChanged as EventListener);
                                        modalElement.removeEventListener("instg:media-expand-toggle", handleExpandToggle as EventListener);
                                        modalWindow.removeEventListener("transitionend", handleModalTransitionEnd);
                                        resizeObserver.disconnect();
                                        observer.disconnect();
                                    };

                                    const observer = new MutationObserver(() => {
                                        if (!document.body.contains(el)) {
                                            cleanup();
                                        }
                                    });

                                    observer.observe(document.body, { childList: true, subtree: true });
                                }

                            }
                        );
                    } else {
                        this.debugStoryLog(program, `opening not-found modal: ${scannerResult.errorMessage || "<no message>"}`);
                        const body = window.location.pathname.startsWith("/stories/")
                            ? this.buildDebugBody(scannerResult)
                            : this.buildNotFoundBody();
                        new Modal({
                            heading: [
                                `<h5>
                                    <span class="header-text-left">${logo}</span>
                                    <span class="header-text-right">v${program.VERSION}<button class="${uiClasses.settings}" style="margin-left:10px">${this.svgSettings.outerHTML}</button></span>
                                </h5>`
                            ],
                            body: [body],
                            bodyStyle: "text-align:center;padding:20px",
                            buttonList: [{ active: true, text: "Ok" }],
                            callback: (_modal, el) => {
                                el.querySelector(`.${uiClasses.settings}`).addEventListener("click", () => {
                                    this.handleSettingsButtonClick(program);
                                });
                            }
                        }).open();
                    }
                } catch (error) {
                    await loadingModal.close();
                    const scanner = new test.scanner();
                    this.debugStoryLog(program, `scanner threw ${scanner.getName()}`);
                    console.error(`Error executing scanner ${scanner.getName()}:`, error);
                }

                return;
            }
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
        this.debugStoryLog(program, "execute entered");
        if (program.DEVELOPMENT) {
            console.log(`${this.getName()}()`, "Starts");
        }
        try {
            // Check if the modal is already open to prevent multiple modals from being triggered
            this.debugStoryLog(program, "before isModalOpen");
            if (this.isModalOpen()) {
                this.debugStoryLog(program, "isModalOpen=true");
                this.shakeModal(uiClasses.modal); // If modal is open, shake it to get attention
                return;
            }

            // Initialize necessary styles for the page
            this.debugStoryLog(program, "before initializeStyles");
            this.initializeStyles(program);
            this.debugStoryLog(program, "after initializeStyles");

            // Handle different URL patterns and trigger the appropriate scanner
            this.debugStoryLog(program, "before handleURLPatterns");
            await this.handleURLPatterns(program);
            this.debugStoryLog(program, "after handleURLPatterns");
        } catch (e) {
            // Log any errors that occur during execution
            this.debugStoryLog(program, `execute catch: ${e instanceof Error ? e.message : String(e)}`);
            console.error(`${this.getName()}()`, `[${program.NAME}] ${program.VERSION}`, e);
        }
    }
}
