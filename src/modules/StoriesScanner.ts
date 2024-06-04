import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { generateModalBody, getElementInViewPercentage } from "../helpers/utils"

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

    // Find a story that is visible in the viewport
    private findVisibleStory(container: HTMLElement): HTMLElement | null {
        const sections = Array.from(container.querySelectorAll("section"))
        return sections.find(section => getElementInViewPercentage(section))?.querySelector("div > div")
    }

    // Find the first visible div element that could potentially contain a story
    private findFirstVisibleDiv(container: HTMLElement): HTMLElement | null {
        return Array.from(container.getElementsByTagName("div"))
            .find(div => div.offsetWidth > 0 && div.offsetHeight > 0)
    }

    // Check local storage for a pause setting and determine if a story should be paused
    private shouldPauseStory(program: Program): boolean {
        return localStorage.getItem(program.STORAGE_NAME + "_settings_stories_2") === "true"
    }

    private async handleHighlights(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const story = this.findVisibleStory(container)
        if (!story) return null

        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement)
        }
        return generateModalBody(story, program)
    }

    private async handleFeedStories(container: HTMLElement, program: Program): Promise<MediaScanResult | null> {
        const story = this.findFirstVisibleDiv(container)
        if (!story) return null

        if (this.shouldPauseStory(program)) {
            this.pausePlayCurrentStory(story as HTMLElement)
        }
        return generateModalBody(story, program)
    }

    // Main execution method to process stories based on URL path
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const $container: HTMLElement = document.querySelector("body > div:nth-child(5)")
            if (!$container) {
                return { found: false, errorMessage: 'No target found.' }
            }

            const path = window.location.pathname
            if (path.startsWith("/stories/highlights/")) {
                return await this.handleHighlights($container, program)
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