import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { fetchDataFromApi, findPostId, getIGUsername, resolveUserIdFromSearch, shortcodeToMediaId } from "../../src/helpers/instagramApi";
import { setLocation } from "../utils/location";

describe("getIGUsername", () => {
    it("extracts the username from a plain profile URL", () => {
        expect(getIGUsername("https://www.instagram.com/some_user/")).toBe("some_user");
    });

    it("extracts the username from a stories URL", () => {
        expect(getIGUsername("https://www.instagram.com/stories/some_user/123456789/")).toBe("some_user");
    });

    it("extracts the username from a reels URL", () => {
        expect(getIGUsername("https://www.instagram.com/reels/some_user/")).toBe("some_user");
    });

    it("returns null for a URL that does not match the Instagram host pattern", () => {
        expect(getIGUsername("https://example.com/some_user/")).toBeNull();
    });
});

describe("shortcodeToMediaId", () => {
    it("is deterministic for the same shortcode", () => {
        const a = shortcodeToMediaId("ABC123abcde");
        const b = shortcodeToMediaId("ABC123abcde");
        expect(a).toBe(b);
        expect(a).not.toBeNull();
    });

    it("returns null for a shortcode containing characters outside the base64-url alphabet", () => {
        expect(shortcodeToMediaId("not a shortcode!")).toBeNull();
    });

    it("returns different ids for different shortcodes", () => {
        expect(shortcodeToMediaId("AAAAAAAAAAA")).not.toBe(shortcodeToMediaId("BBBBBBBBBBB"));
    });
});

describe("findPostId", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("extracts the post id from a /p/ URL", () => {
        setLocation("https://www.instagram.com/p/ABC123abcde/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("ABC123abcde");
    });

    it("truncates an over-long shortcode to the canonical 11-character length", () => {
        setLocation("https://www.instagram.com/p/ABC123abcdeEXTRA/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("ABC123abcde");
    });

    it("extracts the reel id from a /reels/ URL", () => {
        setLocation("https://www.instagram.com/reels/XYZ987xyzab/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("XYZ987xyzab");
    });

    it("extracts the story media id from a /stories/ URL path segment", () => {
        setLocation("https://www.instagram.com/stories/some_user/998877665/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("998877665");
    });

    it("falls back to scanning anchors in the article for a /p/ link", () => {
        setLocation("https://www.instagram.com/");
        const article = document.createElement("article");
        article.innerHTML = '<a href="/p/FALLBACK123/">post</a>';
        expect(findPostId(article)).toBe("FALLBACK123");
    });

    it("returns null when no post id can be found anywhere", () => {
        setLocation("https://www.instagram.com/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBeNull();
    });
});

describe("fetchDataFromApi > getReelsMediaFromFeed", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reels_media: [] }) }));
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    // Regression coverage for https://github.com/saschaheim/instantgram/issues/45:
    // a failed userId lookup for a *regular* story must not be silently
    // treated as "this is a highlight" -- it must bail out with no request.
    it("does not fetch anything for a non-highlight story with no resolved id", async () => {
        setLocation("https://www.instagram.com/stories/some_user/123456789/");
        const article = document.createElement("article");

        const result = await fetchDataFromApi({
            type: "getReelsMediaFromFeed",
            articleNode: article,
            id: null,
            isHighlight: false,
        });

        expect(result).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("builds a plain reel_ids query (no highlight prefix) when a user id is resolved", async () => {
        setLocation("https://www.instagram.com/stories/some_user/123456789/");
        const article = document.createElement("article");

        await fetchDataFromApi({
            type: "getReelsMediaFromFeed",
            articleNode: article,
            id: "999000111",
            isHighlight: false,
        });

        const [calledUrl] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(calledUrl).toContain("reel_ids=999000111");
        expect(calledUrl).not.toContain("highlight");
    });

    it("builds a highlight-prefixed reel_ids query for an actual highlight", async () => {
        setLocation("https://www.instagram.com/stories/highlights/554433/");
        const article = document.createElement("article");

        await fetchDataFromApi({
            type: "getReelsMediaFromFeed",
            articleNode: article,
            id: null,
            isHighlight: true,
        });

        const [calledUrl] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(calledUrl).toContain("reel_ids=highlight%3A");
    });
});

describe("resolveUserIdFromSearch", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    // Fallback for https://github.com/saschaheim/instantgram/issues/45: some
    // accounts break web_profile_info (a real, confirmed Instagram-side
    // schema error) but are still resolvable through search.
    it("returns the matching user's id, matching the username case-insensitively", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                users: [
                    { user: { username: "someone_else", id: "111" } },
                    { user: { username: "Lascanaofficial", id: "999888777" } },
                ],
            }),
        }));

        const userId = await resolveUserIdFromSearch("lascanaofficial");

        expect(userId).toBe("999888777");
        const [calledUrl] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(calledUrl).toContain("topsearch");
        expect(calledUrl).toContain("lascanaofficial");
    });

    it("returns null when no user in the results matches the username", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ users: [{ user: { username: "someone_else", id: "111" } }] }),
        }));

        expect(await resolveUserIdFromSearch("lascanaofficial")).toBeNull();
    });

    it("returns null when the search request itself fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));

        expect(await resolveUserIdFromSearch("lascanaofficial")).toBeNull();
    });

    it("returns null without fetching when no Instagram app id can be found on the page", async () => {
        document.body.innerHTML = "";
        vi.stubGlobal("fetch", vi.fn());

        expect(await resolveUserIdFromSearch("lascanaofficial")).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});
