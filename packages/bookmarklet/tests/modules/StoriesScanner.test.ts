import { describe, it, expect, vi, beforeEach } from "vitest";
import { StoriesScanner } from "../../src/modules/StoriesScanner";
import { createTestProgram } from "../utils/program";
import { setLocation } from "../utils/location";

const { generateModalBody } = vi.hoisted(() => ({ generateModalBody: vi.fn() }));

// StoriesScanner only ever imports generateModalBody from this module, so
// replace the whole module rather than importOriginal -- the real
// modalMedia.ts transitively imports src/index.ts (the browser entry point,
// which runs side effects at import time) via helpers/localize.ts.
vi.mock("../../src/helpers/modalMedia", () => ({ generateModalBody }));

describe("StoriesScanner", () => {
    const program = createTestProgram();

    beforeEach(() => {
        generateModalBody.mockReset();
        document.body.innerHTML = "";
    });

    it("reports found: false when the app's mount container is missing", async () => {
        setLocation("https://www.instagram.com/stories/some_user/123456789/");
        const result = await new StoriesScanner().execute(program);
        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/No target found/i);
    });

    it("reports found: false when the current path is not a stories path", async () => {
        setLocation("https://www.instagram.com/p/ABC123abcde/");
        document.body.innerHTML = '<div id="mount_0"><img src="story.jpg"></div>';
        const result = await new StoriesScanner().execute(program);
        expect(result?.found).toBe(false);
    });

    it("surfaces a found: false result end-to-end when the story has no items (issue #45)", async () => {
        setLocation("https://www.instagram.com/stories/expired_story_user/123456789/");
        document.body.innerHTML = '<div id="mount_0"><img src="story.jpg"></div>';
        generateModalBody.mockResolvedValue({ found: false, errorMessage: "No story items returned by Instagram." });

        const result = await new StoriesScanner().execute(program);

        expect(result?.found).toBe(false);
        expect(generateModalBody).toHaveBeenCalled();
    });

    it("returns the found: true result from generateModalBody for a normal feed story", async () => {
        setLocation("https://www.instagram.com/stories/story_user/123456789/");
        document.body.innerHTML = '<div id="mount_0"><img src="story.jpg"></div>';
        generateModalBody.mockResolvedValue({ found: true, slides: [] });

        const result = await new StoriesScanner().execute(program);

        expect(result?.found).toBe(true);
    });

    it("routes highlight URLs through the highlights handler", async () => {
        setLocation("https://www.instagram.com/stories/highlights/998877/");
        document.body.innerHTML = '<div id="mount_0"><img src="story.jpg"></div>';
        generateModalBody.mockResolvedValue({ found: true, slides: [] });

        const result = await new StoriesScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(generateModalBody).toHaveBeenCalled();
    });
});
