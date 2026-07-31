import { Program } from "../App";
import { Module, NO_TARGET_FOUND, getErrorMessage } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { storiesHighlightsPathPrefix, storiesPathPrefix } from "../helpers/common";
import { getElementWithHighestWidth } from "../helpers/domDetection";
import { generateModalBody } from "../helpers/modalMedia";
import { traverseReactDOMAndFindHidden } from "../helpers/reactMedia";

/**
 * StoriesScanner is a module responsible for scanning and managing stories (e.g., Instagram stories).
 * It interacts with the story elements on the page to pause/play them and determine which story is currently in view.
 */
export class StoriesScanner implements Module {
    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("StoriesScanner").
     */
    public getName(): string {
        return "StoriesScanner";
    }

    /**
     * Pauses or plays the current story based on the SVG icon state.
     * This method checks the SVG path for the pause/play icons and clicks the corresponding button.
     * @param el The HTML element that contains the SVG representing the story controls.
     */
    private pausePlayCurrentStory(el: HTMLElement): void {
        // Find the path element within the SVG that corresponds to the specific pause/play icons
        const pathElement = Array.from(el.querySelectorAll<SVGPathElement>("path"))
            .find(path => path.getAttribute("d")?.startsWith("M15 1c-3.3"));
        (pathElement?.closest('div[role="button"]') as HTMLElement | null)?.click();
    }

    /**
     * Finds the currently visible story in the viewport.
     * This method looks for the story with the highest width in a given container.
     * @param container The container element that holds the stories.
     * @returns {HTMLElement | null} The most visible story element, or null if none is found.
     */
    private findCurrentStory(container: HTMLElement): HTMLElement | null {
        for (const section of container.querySelectorAll<HTMLElement>("section")) {
            const story = getElementWithHighestWidth(section);
            if (story) return story;
        }
        return getElementWithHighestWidth(container)
            || (container.querySelector("video,img") ? container : null);
    }

    /**
     * Handles the scanning and processing of highlights stories.
     * This includes finding the current story and processing it for modal data.
     * @param container The container element holding the story highlights.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or null in case of failure.
     */
    private async tryGenerate(program: Program, ...elements: Array<HTMLElement | null>): Promise<MediaScanResult | null> {
        let fallback: MediaScanResult | null = null;
        for (const element of elements) {
            if (!element) {
                continue;
            }
            const result = await generateModalBody(element, program);
            if (result?.found) {
                return result;
            }
            fallback ??= result;
        }
        return fallback;
    }

    private maybePauseStory(program: Program, story: HTMLElement | null): void {
        if (story && localStorage.getItem(program.STORAGE_NAME + "_s2") === "true") {
            this.pausePlayCurrentStory(story);
        }
    }

    private async handleHighlightsStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const story = this.findCurrentStory(container);
        this.maybePauseStory(program, story);
        return await this.tryGenerate(program, story, story !== container ? container : null);
    }

    /**
     * Handles the scanning and processing of feed stories.
     * It traverses the React DOM to find hidden elements and identifies the most relevant story.
     * @param container The container element holding the feed stories.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or null in case of failure.
     */
    private async handleFeedStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const storyRoot = container.querySelector<HTMLElement>('div > div > div') || container;
        const story = this.findCurrentStory(traverseReactDOMAndFindHidden(storyRoot) || storyRoot);
        this.maybePauseStory(program, story);
        return await this.tryGenerate(
            program,
            story,
            story && story !== storyRoot ? storyRoot : null,
            storyRoot !== container ? container : null
        );
    }

    /**
     * Main execution method to process stories based on URL path.
     * It checks the current path and determines whether to process highlights or feed stories.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or an error message.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const $container: HTMLElement = document.querySelector('[id^="mount_"]'); // Get the container element
            if (!$container) {
                return { found: false, errorMessage: NO_TARGET_FOUND }; // Return error if no container is found
            }

            const path = window.location.pathname; // Get the current URL path
            // Process highlights stories if the path matches
            if (path.startsWith(storiesHighlightsPathPrefix)) {
                return await this.handleHighlightsStories($container, program)
                    || { found: false };
            }
            // Process feed stories if the path matches
            else if (path.startsWith(storiesPathPrefix)) {
                return await this.handleFeedStories($container, program)
                    || { found: false };
            } else {
                return { found: false, errorMessage: NO_TARGET_FOUND }; // Return error if path does not match any story type
            }
        } catch (e) {
            return { found: false, errorMessage: getErrorMessage(e), error: { cause: e } };
        }
    }
}
