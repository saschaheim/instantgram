import { Program } from "../App";
import { Module, runSimpleScan } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { findWithMaxScore, getElementInViewPercentage } from "../helpers/domDetection";

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
     * Finds the most visible article on the page, rejecting elements too
     * small to be real content (likely an ad placeholder).
     * @returns {HTMLElement | null} The most visible article, or null if none qualifies.
     */
    private findArticle(): HTMLElement | null {
        const articles = document.getElementsByTagName("article");
        if (articles.length === 0) {
            return null;
        }
        const article = findWithMaxScore(Array.from(articles), a => getElementInViewPercentage(a) || 0);
        return article && article.getBoundingClientRect().height >= 40 ? article : null;
    }

    /**
     * Executes the scanning process. Collects the media information and finds the most visible article.
     * If an article meets the criteria, it generates and returns modal data; otherwise, it returns an error.
     * @param program The program object containing configuration data.
     * @returns {Promise<MediaScanResult | null>} Returns media scan results or null in case of failure.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        return runSimpleScan(program, this.getName(), () => this.findArticle());
    }
}
