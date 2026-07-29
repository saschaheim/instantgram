import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReelsScanner } from "../../src/modules/ReelsScanner";
import { createTestProgram } from "../utils/program";

const { generateModalBody } = vi.hoisted(() => ({ generateModalBody: vi.fn() }));

// ReelsScanner only ever imports generateModalBody from this module, so
// replace the whole module rather than importOriginal -- the real
// modalMedia.ts transitively imports src/index.ts (the browser entry point,
// which runs side effects at import time) via helpers/localize.ts.
vi.mock("../../src/helpers/modalMedia", () => ({ generateModalBody }));

const rect = (top: number, bottom: number) => ({
    top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top, toJSON() { return {}; },
});

describe("ReelsScanner", () => {
    const program = createTestProgram();

    beforeEach(() => {
        generateModalBody.mockReset();
        document.body.innerHTML = '<section><main><div></div></main></section>';
        // jsdom defaults innerHeight to 0, which makes every element's
        // computed viewport visibility 0 regardless of its rect.
        Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    });

    it("reports found: false when there are no candidate reel containers", async () => {
        const result = await new ReelsScanner().execute(program);
        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/No target found/i);
    });

    it("reports found: false when candidate containers exist but none are visible in the viewport", async () => {
        // The scanner's selector is "section > main > div > div", so the
        // candidate container must sit two levels inside <main>.
        const wrapper = document.querySelector("main > div")!;
        const container = document.createElement("div");
        container.appendChild(document.createElement("span"));
        wrapper.appendChild(container);
        container.getBoundingClientRect = () => rect(10000, 10100);

        const result = await new ReelsScanner().execute(program);
        expect(result?.found).toBe(false);
    });

    it("delegates to generateModalBody with the most visible reel container", async () => {
        const wrapper = document.querySelector("main > div")!;
        const container = document.createElement("div");
        container.appendChild(document.createElement("span"));
        wrapper.appendChild(container);
        container.getBoundingClientRect = () => rect(0, 500);
        generateModalBody.mockResolvedValue({ found: true, slides: [] });

        const result = await new ReelsScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(generateModalBody).toHaveBeenCalledWith(container, program);
    });
});
