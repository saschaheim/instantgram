import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostAndReelScanner } from "../../src/modules/PostAndReelScanner";
import { createTestProgram } from "../utils/program";

const { generateModalBody } = vi.hoisted(() => ({ generateModalBody: vi.fn() }));

// PostAndReelScanner only ever imports generateModalBody from this module, so
// replace the whole module rather than importOriginal -- the real
// modalMedia.ts transitively imports src/index.ts (the browser entry point,
// which runs side effects at import time) via helpers/localize.ts.
vi.mock("../../src/helpers/modalMedia", () => ({ generateModalBody }));

describe("PostAndReelScanner", () => {
    const program = createTestProgram();

    beforeEach(() => {
        generateModalBody.mockReset();
        document.body.innerHTML = "";
    });

    it("reports found: false when no article element exists on the page", async () => {
        const result = await new PostAndReelScanner().execute(program);
        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/No target found/i);
    });

    it("delegates to generateModalBody with the dialog's article element", async () => {
        document.body.innerHTML = '<div role="dialog"><article><a href="/p/ABC123abcde/">post</a></article></div>';
        generateModalBody.mockResolvedValue({ found: true, modalBody: "<div class=\"slide\"></div>" });

        const result = await new PostAndReelScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(generateModalBody).toHaveBeenCalledTimes(1);
        const [calledElement] = generateModalBody.mock.calls[0];
        expect(calledElement.tagName).toBe("ARTICLE");
    });

    it("falls back to the main-section article when there is no dialog", async () => {
        document.body.innerHTML =
            '<section><main><div><div id="first-child"><div id="second-level">content</div></div></div></main></section>';
        generateModalBody.mockResolvedValue({ found: true });

        const result = await new PostAndReelScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(generateModalBody).toHaveBeenCalledTimes(1);
    });
});
