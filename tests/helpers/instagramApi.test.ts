import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { fetchDataFromApi, findPostId, getIGUsername, resolveProfileFromFeed, resolveProfileFromSearch, resolveUserIdFromFeed, resolveUserIdFromSearch, shortcodeToMediaId } from "../../src/helpers/instagramApi";
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

describe("resolveProfileFromSearch", () => {
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

    // For private accounts, /users/{id}/info/ comes back completely empty
    // ({"user":{},"status":"ok"}, confirmed via a real captured response)
    // and the feed fallback is also empty (a private account's feed is
    // empty for a non-follower) -- but search still returns profile_pic_url,
    // since profile pictures are public even for private accounts.
    it("returns both the matched user's id and the raw owner object", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                users: [{ user: { username: "lascanaofficial", id: "999888777", profile_pic_url: "https://scontent.cdninstagram.com/v/pic.jpg" } }],
            }),
        }));

        const result = await resolveProfileFromSearch("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toBe("https://scontent.cdninstagram.com/v/pic.jpg");
    });

    it("returns null userId and null owner when no user in the results matches the username", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ users: [{ user: { username: "someone_else", id: "111" } }] }),
        }));

        const result = await resolveProfileFromSearch("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
    });

    it("returns null userId and null owner without fetching when no Instagram app id can be found", async () => {
        document.body.innerHTML = "";
        vi.stubGlobal("fetch", vi.fn());

        const result = await resolveProfileFromSearch("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe("resolveUserIdFromFeed", () => {
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

    // Fallback for https://github.com/saschaheim/instantgram/issues/45,
    // confirmed by an independent project hitting the same web_profile_info
    // gating: https://github.com/jackwener/opencli/issues/2147. The
    // username-scoped feed endpoint needs no separate id-resolution step and
    // isn't gated the same way.
    it("returns the owner id from the first feed item", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { pk: "999888777" } }] }),
        }));

        const userId = await resolveUserIdFromFeed("lascanaofficial");

        expect(userId).toBe("999888777");
        const [calledUrl] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(calledUrl).toContain("feed/user/");
        expect(calledUrl).toContain("lascanaofficial");
    });

    it("falls back to the item's id field when pk is absent", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { id: "555444333" } }] }),
        }));

        expect(await resolveUserIdFromFeed("lascanaofficial")).toBe("555444333");
    });

    it("returns null when the feed has no items", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));

        expect(await resolveUserIdFromFeed("lascanaofficial")).toBeNull();
    });

    it("returns null when the feed request itself fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));

        expect(await resolveUserIdFromFeed("lascanaofficial")).toBeNull();
    });

    it("returns null without fetching when no Instagram app id can be found on the page", async () => {
        document.body.innerHTML = "";
        vi.stubGlobal("fetch", vi.fn());

        expect(await resolveUserIdFromFeed("lascanaofficial")).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe("resolveProfileFromFeed", () => {
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

    // Some business/creator accounts get a stripped-down response from the
    // web-style /users/{id}/info/ endpoint (no profile_pic_url* field at
    // all, confirmed via a real captured response), even once the id is
    // resolved. Callers that need a profile-picture fallback source use
    // this instead of resolveUserIdFromFeed to also get the owner object.
    it("returns both the owner id and the raw owner object", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { pk: "999888777", profile_pic_url: "https://scontent.cdninstagram.com/v/pic.jpg" } }] }),
        }));

        const result = await resolveProfileFromFeed("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toBe("https://scontent.cdninstagram.com/v/pic.jpg");
    });

    it("returns null userId and null owner when the feed has no items", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));

        const result = await resolveProfileFromFeed("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
    });

    it("returns null userId and null owner without fetching when no Instagram app id can be found", async () => {
        document.body.innerHTML = "";
        vi.stubGlobal("fetch", vi.fn());

        const result = await resolveProfileFromFeed("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});
