import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { generateModalBody } from "../helpers/utils"

export class PostAndReelScanner implements Module {
    public getName(): string {
        return "PostAndReelScanner"
    }

    /** Fetches the article element from the DOM */
    private getArticleElement(): HTMLElement | null {
        return document.querySelector("div[role='dialog'] article") ||
            document.querySelector("section main > div > :first-child > :first-child")
    }

    /** Main execution method for scanning posts and reels */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        try {
            const $article = this.getArticleElement()
            if (!$article) {
                return { found: false, errorMessage: 'No target found.' }
            }

            const modalData = await generateModalBody($article, program)
            return modalData
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e)
            return { found: false, errorMessage: e.message, error: e }
        }
    }
}