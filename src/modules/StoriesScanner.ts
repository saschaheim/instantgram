import { Program } from "../App";
import { Module, NO_TARGET_FOUND, getErrorMessage } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
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
            .find(p => p.getAttribute("d") === "M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z");

        // If the path element is found, click the closest button element to pause/play the story
        if (pathElement) {
            const buttonElement = pathElement.closest('div[role="button"]') as HTMLElement | null;
            buttonElement?.click();
        }
    }

    /**
     * Checks local storage for a pause setting and determines if a story should be paused.
     * @param program The program object containing configuration or context for the module.
     * @returns {boolean} True if the story should be paused, false otherwise.
     */
    private shouldPauseStory(program: Program): boolean {
        return localStorage.getItem(program.STORAGE_NAME + "_s2") === "true";
    }

    /**
     * Finds the currently visible story in the viewport.
     * This method looks for the story with the highest width in a given container.
     * @param container The container element that holds the stories.
     * @returns {HTMLElement | null} The most visible story element, or null if none is found.
     */
    private findCurrentStory(container: HTMLElement): HTMLElement | null {
        // Get all section elements within the container
        const sections = Array.from(container.querySelectorAll<HTMLElement>("section"));
        let maxWidthElement: HTMLElement | null = null;

        // Find the story with the highest width in the container
        for (const section of sections) {
            const el = getElementWithHighestWidth(section); // Get the element with the highest width
            if (el) {
                maxWidthElement = el;
                break;
            }
        }

        if (maxWidthElement) {
            return maxWidthElement;
        }

        const fallbackElement = getElementWithHighestWidth(container);
        if (fallbackElement) {
            return fallbackElement;
        }

        if (container.querySelector("video, img")) {
            return container;
        }

        return maxWidthElement; // Return the element with the highest width
    }

    /**
     * Handles the scanning and processing of highlights stories.
     * This includes finding the current story and processing it for modal data.
     * @param container The container element holding the story highlights.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or null in case of failure.
     */
    private async handleHighlightsStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const story = this.findCurrentStory(container); // Find the current story in the container
        if (!story) {
            return await generateModalBody(container, program);
        }

        // If the story should be paused, pause or play the story
        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement);
        }

        // Generate modal data for the story and return it
        const primaryResult = await generateModalBody(story, program);
        if (primaryResult?.found) {
            return primaryResult;
        }

        if (story !== container) {
            return await generateModalBody(container, program);
        }

        return primaryResult;
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
        let story = traverseReactDOMAndFindHidden(storyRoot) || storyRoot; // Traverse React DOM to find hidden elements
        story = this.findCurrentStory(story); // Find the most relevant story in the feed
        if (!story) {
            const rootResult = await generateModalBody(storyRoot, program);
            if (rootResult?.found) {
                return rootResult;
            }
            return await generateModalBody(container, program);
        }

        // If the story should be paused, pause or play the story
        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement);
        }

        // Generate modal data for the story and return it
        const primaryResult = await generateModalBody(story, program);
        if (primaryResult?.found) {
            return primaryResult;
        }

        if (story !== storyRoot) {
            const rootResult = await generateModalBody(storyRoot, program);
            if (rootResult?.found) {
                return rootResult;
            }
        }

        if (storyRoot !== container) {
            const containerResult = await generateModalBody(container, program);
            if (containerResult?.found) {
                return containerResult;
            }
        }

        return primaryResult;
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
            if (path.startsWith("/stories/highlights/")) {
                return await this.handleHighlightsStories($container, program)
                    || { found: false, errorMessage: "Highlights handler returned null" };
            }
            // Process feed stories if the path matches
            else if (path.startsWith("/stories/")) {
                return await this.handleFeedStories($container, program)
                    || { found: false, errorMessage: "Feed stories handler returned null" };
            } else {
                return { found: false, errorMessage: NO_TARGET_FOUND }; // Return error if path does not match any story type
            }
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e);
            return { found: false, errorMessage: getErrorMessage(e), error: { cause: e } };
        }
    }
}
