import { Program } from "../App";
import { Module } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { getElementInViewPercentage, generateModalBody } from "../helpers/utils";

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
     * Collects information on media elements (e.g., images, videos) within the feed.
     * Each element is checked for its visibility percentage.
     * @param articles HTMLCollection of articles to scan for media elements.
     * @returns {Array<{ i1: number, mediaEl: Element, elemVisiblePercentage: number }>} Array containing media element info.
     */
    private collectMediaElementsInfo(articles: HTMLCollectionOf<HTMLElement>): Array<{ i1: number, mediaEl: Element, elemVisiblePercentage: number }> {
        return Array.from(articles).map((mediaEl, index) => ({
            i1: index,
            mediaEl: mediaEl,
            elemVisiblePercentage: getElementInViewPercentage(mediaEl) || 0 // Calculate visibility of each media element
        }));
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
                return { found: false, errorMessage: 'No target found.' };
            }

            // Collect media element information (visibility, index)
            const mediaElementsInfo = this.collectMediaElementsInfo(articles);

            // Find the most visible article based on visibility percentage
            const mostVisibleArticle = mediaElementsInfo.reduce((max, current) =>
                max.elemVisiblePercentage > current.elemVisiblePercentage ? max : current
            );

            // Get the actual article element based on the index
            const article = articles[mostVisibleArticle.i1];

            // If the article is too small or doesn't exist, return an error
            if (!article || article.getBoundingClientRect().height < 40) {
                return { found: false, errorMessage: 'Article not found or too small, likely an ad' };
            }

            // Generate the modal data for the most visible article
            const modalData = await generateModalBody(article, program);
            return modalData; // Return the modal data

        } catch (e) {
            // Log any errors to the console with program details
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e);
            return { found: false, errorMessage: e.message, error: e }; // Return error information
        }
    }
}