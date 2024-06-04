import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { getElementInViewPercentage, generateModalBody } from "../helpers/utils"

export class FeedScanner implements Module {
    public getName(): string {
        return "FeedScanner"
    }

    /** Collects information on media elements in the feed */
    private collectMediaElementsInfo(articles: HTMLCollectionOf<HTMLElement>): Array<{ i1: number, mediaEl: Element, elemVisiblePercentage: number }> {
        return Array.from(articles).map((mediaEl, index) => ({
            i1: index,
            mediaEl: mediaEl,
            elemVisiblePercentage: getElementInViewPercentage(mediaEl) || 0
        }))
    }

    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const articles = document.getElementsByTagName("article")
            if (articles.length === 0) {
                return { found: false, errorMessage: 'No target found.' }
            }

            const mediaElementsInfo = this.collectMediaElementsInfo(articles)
            const mostVisibleArticle = mediaElementsInfo.reduce((max, current) =>
                max.elemVisiblePercentage > current.elemVisiblePercentage ? max : current
            )

            const article = articles[mostVisibleArticle.i1]
            if (!article || article.getBoundingClientRect().height < 40) {
                return { found: false, errorMessage: 'Article not found or too small, likely an ad' }
            }

            const modalData = await generateModalBody(article, program)
            return modalData
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e)
            return { found: false, errorMessage: e.message, error: e }
        }
    }

}