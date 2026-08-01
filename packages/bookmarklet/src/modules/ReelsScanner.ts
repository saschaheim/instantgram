import { Program } from "../App";
import { Module, runSimpleScan } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { findWithMaxScore, getElementInViewPercentage } from "../helpers/domDetection";

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
        return findWithMaxScore(articles, getElementInViewPercentage, true);
    }

    /**
     * Main execution method for scanning Reels.
     * This method identifies the most relevant article and generates modal data for it.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or null in case of failure.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        return runSimpleScan(program, this.getName(), () => this.findMostRelevantArticle(this.getRelevantArticles()));
    }
}
