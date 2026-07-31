import { Program } from "../App";
import { Module, NO_TARGET_FOUND, handleScanError } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { findWithMaxScore, getElementInViewPercentage } from "../helpers/domDetection";
import { generateModalBody } from "../helpers/modalMedia";

/**
 * FeedScanner is a module responsible for scanning the feed and collecting media-related information from the articles.
 * It implements the Module interface, allowing integration into the broader program.
 */
export class FeedScanner implements Module {
    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("FeedScanner").
     */
    public getName(): string {
        return "FeedScanner";
    }

    /**
     * Executes the scanning process. Collects the media information and finds the most visible article.
     * If an article meets the criteria, it generates and returns modal data; otherwise, it returns an error.
     * @param program The program object containing configuration data.
     * @returns {Promise<MediaScanResult | null>} Returns media scan results or null in case of failure.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            // Get all articles on the page
            const articles = document.getElementsByTagName("article");
            
            // If no articles are found, return an error
            if (articles.length === 0) {
                return { found: false, errorMessage: NO_TARGET_FOUND };
            }

            // Find the most visible article based on visibility percentage
            const article = findWithMaxScore(Array.from(articles), a => getElementInViewPercentage(a) || 0);

            // If the article is too small or doesn't exist, return an error
            if (!article || article.getBoundingClientRect().height < 40) {
                return { found: false };
            }

            // Generate the modal data for the most visible article
            const modalData = await generateModalBody(article, program);
            return modalData; // Return the modal data

        } catch (e) {
            return handleScanError(program, this.getName(), e);
        }
    }
}
