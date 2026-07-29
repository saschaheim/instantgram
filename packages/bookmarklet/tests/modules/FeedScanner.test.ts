import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeedScanner } from "../../src/modules/FeedScanner";
import { createTestProgram } from "../utils/program";

const { generateModalBody } = vi.hoisted(() => ({ generateModalBody: vi.fn() }));

// FeedScanner only ever imports generateModalBody from this module, so
// replace the whole module rather than importOriginal -- the real
// modalMedia.ts transitively imports src/index.ts (the browser entry point,
// which runs side effects at import time) via helpers/localize.ts.
vi.mock("../../src/helpers/modalMedia", () => ({ generateModalBody }));

describe("FeedScanner", () => {
    const program = createTestProgram();

    beforeEach(() => {
        generateModalBody.mockReset();
        document.body.innerHTML = "";
    });

    it("reports found: false when there are no <article> elements", async () => {
        const result = await new FeedScanner().execute(program);
        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/No target found/i);
    });

    it("reports found: false when the only article is too small (likely an ad placeholder)", async () => {
        const article = document.createElement("article");
        document.body.appendChild(article);
        article.getBoundingClientRect = () => ({
            top: 0, bottom: 10, left: 0, right: 0, width: 0, height: 10, x: 0, y: 0, toJSON() { return {}; },
        });

        const result = await new FeedScanner().execute(program);
        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toBeUndefined();
        expect(generateModalBody).not.toHaveBeenCalled();
    });

    it("delegates to generateModalBody with a properly sized article", async () => {
        const article = document.createElement("article");
        document.body.appendChild(article);
        article.getBoundingClientRect = () => ({
            top: 0, bottom: 500, left: 0, right: 0, width: 0, height: 500, x: 0, y: 0, toJSON() { return {}; },
        });
        generateModalBody.mockResolvedValue({ found: true, slides: [] });

        const result = await new FeedScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(generateModalBody).toHaveBeenCalledWith(article, program);
    });
});
