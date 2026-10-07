import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComponentChildren, render } from "preact";
import { setLocation } from "../utils/location";

// MediaScanner -> helpers/localize.ts -> src/index.ts, and separately
// MediaScanner -> components/modal/index.tsx -> src/index.ts (the browser
// entry point, which runs side effects -- including `new MediaScanner()` --
// at import time). Stub both so importing the real MediaScanner class for
// its buildNotFoundBody method doesn't drag that in.
vi.mock("../../src/helpers/localize", () => ({
    default: (key: string) => {
        const strings: Record<string, string> = {
            "a.nf": "Did you open any Instagram post? Like for example",
            "a.ie": "Media unavailable. Reload Instagram.",
        };
        return strings[key] ?? key;
    },
}));
vi.mock("../../src/components/modal", () => ({ Modal: class {} }));

import { MediaScanner } from "../../src/modules/MediaScanner";

// buildNotFoundBody is private -- accessed via a cast, the same way the real
// call site (handleURLPatterns) invokes it internally.
const renderNotFoundBody = (errorMessage?: string): HTMLElement => {
    const body = (new MediaScanner() as unknown as {
        buildNotFoundBody(msg?: string): ComponentChildren;
    }).buildNotFoundBody(errorMessage);
    const host = document.createElement("div");
    render(body, host);
    return host;
};

describe("MediaScanner > buildNotFoundBody", () => {
    beforeEach(() => setLocation("https://www.instagram.com/p/ABC123abcde/"));

    it.each([undefined, "No target found.", "No story items returned by Instagram."])(
        "shows a story-specific message for a failed story scan (%s)", (message) => {
            setLocation("https://www.instagram.com/stories/tinaruthe/4000437001439449734/");
            const body = renderNotFoundBody(message);
            expect(body.textContent).toContain("Media unavailable. Reload Instagram.");
            expect(body.textContent).not.toContain("Did you open any Instagram post?");
            expect(body.querySelector("a")).toBeNull();
        }
    );

    it("shows a story-specific message for unavailable highlights", () => {
        setLocation("https://www.instagram.com/stories/highlights/123456/");
        expect(renderNotFoundBody().textContent).toContain("Media unavailable. Reload Instagram.");
    });
    // Regression coverage for the follow-up to issue #45: a user who opened a
    // real, valid story was shown "Did you open any Instagram post?" -- a
    // message that implies user/navigation error -- when the actual cause was
    // Instagram's API failing server-side. That's misleading: a target WAS
    // found, only the data fetch failed.
    it("shows the generic 'wrong page' hint when nothing was found on the page at all", () => {
        const body = renderNotFoundBody("No target found.");
        expect(body.textContent).toContain("Did you open any Instagram post?");
        expect(body.querySelector("a")?.href).toContain("https://www.instagram.com/p/CIGrv1VMBkS/");
    });

    it("shows the generic 'wrong page' hint when there is no specific error message", () => {
        const body = renderNotFoundBody(undefined);
        expect(body.textContent).toContain("Did you open any Instagram post?");
    });

    it("shows an unsupported-media message (not the 'wrong page' hint) when a target was found but Instagram's API failed", () => {
        const body = renderNotFoundBody("No story items returned by Instagram.");
        expect(body.textContent).toContain("Media unavailable. Reload Instagram.");
        expect(body.textContent).not.toContain("Did you open any Instagram post?");
        expect(body.querySelector("a")).toBeNull();
    });

    it("logs the underlying errorMessage to the console for debugging instead of showing it in the UI", () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
        const body = renderNotFoundBody("No media items returned by Instagram.");

        expect(body.textContent).not.toContain("No media items returned by Instagram.");
        expect(infoSpy).toHaveBeenCalledWith(
            expect.stringContaining("Instagram returned an error"),
            "No media items returned by Instagram."
        );

        infoSpy.mockRestore();
    });
});
