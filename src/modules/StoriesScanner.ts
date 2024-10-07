import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { generateModalBody, getElementWithHighestWidth, traverseReactDOMAndFindHidden } from "../helpers/utils"

export class StoriesScanner implements Module {
    // Returns the name of the module
    public getName(): string {
        return "StoriesScanner"
    }

    // Pauses or plays the current story based on the SVG icon state
    private pausePlayCurrentStory(el: HTMLElement): void {
        // Find the path element within the SVG that corresponds to the specific pause/play icons
        const pathElement = Array.from(el.querySelectorAll<SVGPathElement>("path"))
            .find(p => p.getAttribute("d") === "M15 1c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3zm18 0c-3.3 0-6 1.3-6 3v40c0 1.7 2.7 3 6 3s6-1.3 6-3V4c0-1.7-2.7-3-6-3z")

        if (pathElement) {
            const buttonElement = pathElement.closest('div[role="button"]') as HTMLElement | null
            buttonElement?.click()
        }
    }

    // Check local storage for a pause setting and determine if a story should be paused
    private shouldPauseStory(program: Program): boolean {
        return localStorage.getItem(program.STORAGE_NAME + "_settings_stories_2") === "true"
    }

    // Find a story that is visible in the viewport
    private findCurrentStory(container: HTMLElement): HTMLElement | null {
        const sections = Array.from(container.querySelectorAll<HTMLElement>("section"));
        let maxWidthElement: HTMLElement | null = null;

        for (const section of sections) {
            const el = getElementWithHighestWidth(section);
            if (el) {
                maxWidthElement = el;
                break;
            }
        }

        return maxWidthElement;
    }

    private async handleHighlightsStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const story = this.findCurrentStory(container)
        if (!story) return null

        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement)
        }
        return generateModalBody(story, program)
    }

    private async handleFeedStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        let story = traverseReactDOMAndFindHidden(container.querySelector('div > div > div'))
        story = this.findCurrentStory(story)
        if (!story) return null

        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement)
        }
        return generateModalBody(story, program)
    }

    // Main execution method to process stories based on URL path
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const $container: HTMLElement = document.querySelector('[id^="mount_"]')
            if (!$container) {
                return { found: false, errorMessage: 'No target found.' }
            }

            const path = window.location.pathname
            if (path.startsWith("/stories/highlights/")) {
                return await this.handleHighlightsStories($container, program)
            } else if (path.startsWith("/stories/")) {
                return await this.handleFeedStories($container, program)
            } else {
                return { found: false, errorMessage: 'No target found.' }
            }
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e)
            return { found: false, errorMessage: e.message, error: e }
        }
    }
}