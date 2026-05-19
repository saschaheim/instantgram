import { Program } from "../App";
import { Module } from "./Module";
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

    private debug(program: Program, trail: string[], step: string): void {
        trail.push(step);
        console.info(`[${program.NAME}] Stories debug: ${step}`);
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
        return localStorage.getItem(program.STORAGE_NAME + "_settings_stories_2") === "true";
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
    private async handleHighlightsStories(container: HTMLElement, program: Program, trail: string[]): Promise<MediaScanResult | null> {
        const story = this.findCurrentStory(container); // Find the current story in the container
        if (!story) {
            this.debug(program, trail, "Highlights: no direct story node, falling back to container");
            return await generateModalBody(container, program);
        }

        // If the story should be paused, pause or play the story
        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement);
        }

        // Generate modal data for the story and return it
        this.debug(program, trail, "Highlights: generateModalBody(story)");
        const primaryResult = await generateModalBody(story, program);
        if (primaryResult?.found) {
            this.debug(program, trail, "Highlights: story result found");
            return primaryResult;
        }

        if (story !== container) {
            this.debug(program, trail, "Highlights: story result empty, retrying with container");
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
    private async handleFeedStories(container: HTMLElement, program: Program, trail: string[]): Promise<MediaScanResult | null> {
        const storyRoot = container.querySelector<HTMLElement>('div > div > div') || container;
        this.debug(program, trail, `Feed: storyRoot=${storyRoot === container ? "container" : "nested-root"}`);
        let story = traverseReactDOMAndFindHidden(storyRoot) || storyRoot; // Traverse React DOM to find hidden elements
        this.debug(program, trail, `Feed: hiddenTraverse=${story === storyRoot ? "fallback-root" : "react-node"}`);
        story = this.findCurrentStory(story); // Find the most relevant story in the feed
        if (!story) {
            this.debug(program, trail, "Feed: no story node after findCurrentStory, trying storyRoot");
            const rootResult = await generateModalBody(storyRoot, program);
            if (rootResult?.found) {
                this.debug(program, trail, "Feed: storyRoot result found");
                return rootResult;
            }
            this.debug(program, trail, "Feed: storyRoot result empty, trying container");
            return await generateModalBody(container, program);
        }

        // If the story should be paused, pause or play the story
        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement);
        }

        // Generate modal data for the story and return it
        this.debug(program, trail, "Feed: generateModalBody(story)");
        const primaryResult = await generateModalBody(story, program);
        if (primaryResult?.found) {
            this.debug(program, trail, "Feed: story result found");
            return primaryResult;
        }

        if (story !== storyRoot) {
            this.debug(program, trail, "Feed: story result empty, retrying with storyRoot");
            const rootResult = await generateModalBody(storyRoot, program);
            if (rootResult?.found) {
                this.debug(program, trail, "Feed: storyRoot retry found");
                return rootResult;
            }
        }

        if (storyRoot !== container) {
            this.debug(program, trail, "Feed: storyRoot retry empty, trying container");
            const containerResult = await generateModalBody(container, program);
            if (containerResult?.found) {
                this.debug(program, trail, "Feed: container retry found");
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
        const debugTrail: string[] = [];
        try {
            const $container: HTMLElement = document.querySelector('[id^="mount_"]'); // Get the container element
            if (!$container) {
                this.debug(program, debugTrail, "Execute: mount container missing");
                return { found: false, errorMessage: 'No target found.', error: { debugTrail } }; // Return error if no container is found
            }

            const path = window.location.pathname; // Get the current URL path
            this.debug(program, debugTrail, `Execute: path=${path}`);
            // Process highlights stories if the path matches
            if (path.startsWith("/stories/highlights/")) {
                const result = await this.handleHighlightsStories($container, program, debugTrail);
                return result ? { ...result, error: { ...(typeof result.error === "object" && result.error ? result.error as object : {}), debugTrail } } : { found: false, errorMessage: "Highlights handler returned null", error: { debugTrail } };
            }
            // Process feed stories if the path matches
            else if (path.startsWith("/stories/")) {
                const result = await this.handleFeedStories($container, program, debugTrail);
                return result ? { ...result, error: { ...(typeof result.error === "object" && result.error ? result.error as object : {}), debugTrail } } : { found: false, errorMessage: "Feed stories handler returned null", error: { debugTrail } };
            } else {
                this.debug(program, debugTrail, "Execute: path did not match stories");
                return { found: false, errorMessage: 'No target found.', error: { debugTrail } }; // Return error if path does not match any story type
            }
        } catch (e) {
            // Log any errors during execution
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            this.debug(program, debugTrail, `Execute: exception=${errorMessage}`);
            return { found: false, errorMessage, error: { cause: e, debugTrail } }; // Return error information
        }
    }
}
