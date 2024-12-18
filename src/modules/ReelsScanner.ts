import { Program } from "../App";
import { Module } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { getElementInViewPercentage, generateModalBody } from "../helpers/utils";

/**
 * ReelsScanner is a module responsible for scanning and processing reels (media content) on the page.
 * It identifies the most relevant articles based on visibility and generates modal data for them.
 */
export class ReelsScanner implements Module {
    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("ReelsScanner").
     */
    public getName(): string {
        return "ReelsScanner";
    }

    /**
     * Fetches the relevant article elements from the DOM.
     * It selects articles based on a specific CSS selector.
     * @returns {HTMLElement[]} Array of relevant article elements.
     */
    private getRelevantArticles(): HTMLElement[] {
        const articles = document.querySelectorAll("section > main > div > div");
        
        // Filter and return only those articles that have child elements
        return Array.from(articles).filter(article => article.children.length > 0) as HTMLElement[];
    }

    /**
     * Determines the most relevant article based on its visibility.
     * The article with the highest visibility is considered the most relevant.
     * @param articles The list of articles to evaluate.
     * @returns {HTMLElement | null} The most relevant article or null if none is found.
     */
    private findMostRelevantArticle(articles: HTMLElement[]): HTMLElement | null {
        if (articles.length === 0) {
            return null; // Return null if no articles are provided
        }

        // Map each article to an object containing its index, reference, and visibility
        const mediaElementInfos = articles.map((article, index) => ({
            index,
            article,
            visibility: getElementInViewPercentage(article) // Calculate visibility for each article
        }));

        // Find the article with the highest visibility
        const mostVisible = mediaElementInfos.reduce((max, current) => (
            max.visibility > current.visibility ? max : current
        ), { index: -1, visibility: 0 }); // Initialize with -1 to handle empty array gracefully

        // Return the most visible article if its visibility is above 0
        return mostVisible.visibility > 0 ? articles[mostVisible.index] : null;
    }

    /**
     * Main execution method for scanning Reels.
     * This method identifies the most relevant article and generates modal data for it.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or null in case of failure.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const articles = this.getRelevantArticles(); // Get relevant articles
            const mostRelevantArticle = this.findMostRelevantArticle(articles); // Find the most relevant article

            // If no relevant article is found, return an error
            if (!mostRelevantArticle) {
                return { found: false, errorMessage: 'No target found.' };
            }

            // Generate modal data for the most relevant article
            const modalData = await generateModalBody(mostRelevantArticle, program);
            return modalData; // Return the modal data
        } catch (e) {
            // Log any errors during execution
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e);
            return { found: false, errorMessage: e.message, error: e }; // Return error information
        }
    }
}