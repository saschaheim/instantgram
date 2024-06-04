import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { getElementInViewPercentage, generateModalBody } from "../helpers/utils"

export class ReelsScanner implements Module {
    public getName(): string {
        return "ReelsScanner"
    }

    /** Fetches relevant articles from the DOM */
    private getRelevantArticles(): HTMLElement[] {
        const articles = document.querySelectorAll("section > main > div > div")
        // Cast each Element to HTMLElement
        return Array.from(articles).filter(article => article.children.length > 0) as HTMLElement[]
    }

    /** Determines the most relevant article based on visibility */
    private findMostRelevantArticle(articles: HTMLElement[]): HTMLElement | null {
        if (articles.length === 0) {
            return null // Immediately return null if no articles are provided
        }

        const mediaElementInfos = articles.map((article, index) => ({
            index,
            article,
            visibility: getElementInViewPercentage(article) // This function should accept HTMLElement
        }))

        const mostVisible = mediaElementInfos.reduce((max, current) => (
            max.visibility > current.visibility ? max : current
        ), { index: -1, visibility: 0 }) // Initialize with -1 to handle empty array gracefully

        return mostVisible.visibility > 0 ? articles[mostVisible.index] : null
    }

    /** Main execution method for scanning Reels */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const articles = this.getRelevantArticles()
            const mostRelevantArticle = this.findMostRelevantArticle(articles)
            if (!mostRelevantArticle) {
                return { found: false, errorMessage: 'No target found.' }
            }

            const modalData = await generateModalBody(mostRelevantArticle, program)
            return modalData
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e)
            return { found: false, errorMessage: e.message, error: e }
        }
    }
}