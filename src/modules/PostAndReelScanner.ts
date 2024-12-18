import { Program } from "../App";
import { Module } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { generateModalBody } from "../helpers/utils";

/**
 * PostAndReelScanner is a module responsible for scanning posts and reels on the page.
 * It retrieves the relevant article element and processes it to generate modal data.
 */
export class PostAndReelScanner implements Module {
    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("PostAndReelScanner").
     */
    public getName(): string {
        return "PostAndReelScanner";
    }

    /**
     * Fetches the article element from the DOM.
     * This method tries to find the article element for either a dialog or a general post/reel section.
     * @returns {HTMLElement | null} The article element or null if not found.
     */
    private getArticleElement(): HTMLElement | null {
        // Try to get article element from dialog or main section
        return document.querySelector("div[role='dialog'] article") ||
            document.querySelector("section main > div > :first-child > :first-child");
    }

    /**
     * Main execution method for scanning posts and reels.
     * It retrieves the article element and generates modal data based on the content.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The modal data or null in case of failure.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const $article = this.getArticleElement(); // Get the article element

            // If no article is found, return an error
            if (!$article) {
                return { found: false, errorMessage: 'No target found.' };
            }

            // Generate the modal data based on the article element
            const modalData = await generateModalBody($article, program);
            return modalData; // Return the generated modal data
        } catch (e) {
            // Log any errors that occur during execution
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e);
            return { found: false, errorMessage: e.message, error: e }; // Return error information
        }
    }
}