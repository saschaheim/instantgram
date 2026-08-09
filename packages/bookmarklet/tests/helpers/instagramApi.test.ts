import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
    fetchDataFromApi,
    fetchGraphqlOwner,
    findPostId,
    getIGUsername,
    resolveProfile,
    shortcodeToMediaId
} from "../../src/helpers/instagramApi";
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

describe("resolveProfile", () => {
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

    it("returns the id and owner from the username feed", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: {
                pk: "999888777",
                profile_pic_url: "https://scontent.cdninstagram.com/v/pic.jpg",
            } }] }),
        }));

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toContain("pic.jpg");
        const [calledUrl] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(calledUrl).toContain("feed/user/");
        expect(calledUrl).toContain("lascanaofficial");
    });

    it("uses the feed owner's id when pk is absent", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { id: 555444333 } }] }),
        }));

        expect((await resolveProfile("lascanaofficial")).userId).toBe("555444333");
    });

    it("falls back to search and matches the username case-insensitively", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    users: [
                        { user: { username: "someone_else", id: "111" } },
                        { user: {
                            username: "Lascanaofficial",
                            id: "999888777",
                            profile_pic_url: "https://scontent.cdninstagram.com/v/search.jpg",
                        } },
                    ],
                }),
            });
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toContain("search.jpg");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toContain("topsearch");
    });

    it("falls back to search when the feed request fails", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 429 })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    users: [{ user: { username: "lascanaofficial", id: "999888777" } }],
                }),
            });
        vi.stubGlobal("fetch", fetchMock);

        expect((await resolveProfile("lascanaofficial")).userId).toBe("999888777");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns null values when neither feed nor search finds the profile", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ users: [{ user: { username: "someone_else", id: "111" } }] }),
            });
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
    });
});

describe("fetchGraphqlOwner", () => {
    const addScript = (content: string) => {
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = content;
        document.body.appendChild(script);
    };

    beforeEach(() => {
        document.body.innerHTML = "";
        addScript('"X-IG-App-ID":"123456789"');
        document.cookie = "csrftoken=csrf-value";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    // The query resolves to a null user without fb_dtsg (verified live), so
    // there is no point firing it when the page tokens can't be scraped.
    it("returns null without sending anything when the page tokens are missing", async () => {
        vi.stubGlobal("fetch", vi.fn());

        expect(await fetchGraphqlOwner("2936798892")).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("posts the tokens it scraped and returns the graphql user", async () => {
        addScript('"LSD",[],{"token":"lsd-value"}');
        addScript('"DTSGInitialData",[],{"token":"dtsg-value"}');
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { user: { hd_profile_pic_url_info: { url: "https://cdn/full.jpg" } } } }),
        }));

        const owner = await fetchGraphqlOwner("2936798892");

        expect(owner?.hd_profile_pic_url_info?.url).toBe("https://cdn/full.jpg");
        const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(url).toContain("api/graphql");
        expect(init.method).toBe("POST");
        expect(init.body).toContain("fb_dtsg=dtsg-value");
        expect(init.body).toContain("lsd=lsd-value");
        expect(init.body).toContain("2936798892");
    });
});
