import { describe, it, expect, vi } from "vitest";

// MediaScanner -> helpers/localize.ts -> src/index.ts, and separately
// MediaScanner -> components/Modal.ts -> src/index.ts (the browser entry
// point, which runs side effects -- including `new MediaScanner()` -- at
// import time). Stub both so importing the real MediaScanner class for its
// buildNotFoundBody method doesn't drag that in.
vi.mock("../../src/helpers/localize", () => ({
    default: (key: string) => {
        const strings: Record<string, string> = {
            "a.nf": "Did you open any Instagram post? Like for example",
            "a.ie": "This media could not be loaded because it isn't supported yet.",
        };
        return strings[key] ?? key;
    },
}));
vi.mock("../../src/components/Modal", () => ({ Modal: class {} }));

import { MediaScanner } from "../../src/modules/MediaScanner";

// buildNotFoundBody is private -- accessed via a cast, the same way the real
// call site (handleURLPatterns) invokes it internally.
const buildNotFoundBody = (errorMessage?: string): string =>
    (new MediaScanner() as unknown as { buildNotFoundBody(msg?: string): string }).buildNotFoundBody(errorMessage);

describe("MediaScanner > buildNotFoundBody", () => {
    // Regression coverage for the follow-up to issue #45: a user who opened a
    // real, valid story was shown "Did you open any Instagram post?" -- a
    // message that implies user/navigation error -- when the actual cause was
    // Instagram's API failing server-side. That's misleading: a target WAS
    // found, only the data fetch failed.
    it("shows the generic 'wrong page' hint when nothing was found on the page at all", () => {
        const body = buildNotFoundBody("No target found.");
        expect(body).toContain("Did you open any Instagram post?");
        expect(body).toContain("https://www.instagram.com/p/CIGrv1VMBkS/");
    });

    it("shows the generic 'wrong page' hint when there is no specific error message", () => {
        const body = buildNotFoundBody(undefined);
        expect(body).toContain("Did you open any Instagram post?");
    });

    it("shows an unsupported-media message (not the 'wrong page' hint) when a target was found but Instagram's API failed", () => {
        const body = buildNotFoundBody("No story items returned by Instagram.");
        expect(body).toContain("This media could not be loaded because it isn't supported yet.");
        expect(body).not.toContain("Did you open any Instagram post?");
        expect(body).not.toContain("https://www.instagram.com/p/CIGrv1VMBkS/");
    });

    it("logs the underlying errorMessage to the console for debugging instead of showing it in the UI", () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        const body = buildNotFoundBody("No media items returned by Instagram.");

        expect(body).not.toContain("No media items returned by Instagram.");
        expect(infoSpy).toHaveBeenCalledWith(
            expect.stringContaining("Instagram returned an error"),
            "No media items returned by Instagram."
        );

        infoSpy.mockRestore();
    });
});
