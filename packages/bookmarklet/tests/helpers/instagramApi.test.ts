import { profilePageResponse } from "../utils/profilePage";
import { loadFixture } from "../utils/fixtures";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
    fetchDataFromApi,
    fetchGraphqlOwner,
    findEmbeddedProfile,
    findPostId,
    getIGUsername,
    resolveProfile,
    shortcodeToMediaId
} from "../../src/helpers/instagramApi";
import { setLocation } from "../utils/location";

const embeddedScript = (fixture: string) =>
    '<script type="application/json">'+JSON.stringify(loadFixture<unknown>(fixture))+'</script>';
const htmlResponse = (html: string) => ({ ok: true, text: async () => html });

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

    it("extracts the username from a username-prefixed post URL", () => {
        expect(getIGUsername("https://www.instagram.com/some_user/p/ABC123abcde/")).toBe("some_user");
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

    it("extracts the post id from a username-prefixed /p/ URL", () => {
        setLocation("https://www.instagram.com/some_user/p/ABC123abcde/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("ABC123abcde");
    });

    it("extracts the reel id from a username-prefixed /reel/ URL", () => {
        setLocation("https://www.instagram.com/some_user/reel/XYZ987xyzab/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBe("XYZ987xyzab");
    });

    it("does not mistake a profile's reels tab for a reel", () => {
        setLocation("https://www.instagram.com/some_user/reels/");
        const article = document.createElement("article");
        expect(findPostId(article)).toBeNull();
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

    it("falls back to scanning anchors in the article for a username-prefixed /p/ link", () => {
        setLocation("https://www.instagram.com/");
        const article = document.createElement("article");
        article.innerHTML = '<a href="/some_user/p/FALLBACK123/">post</a>';
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
    it("does not fetch anything for a story with neither an owner id nor a media id", async () => {
        setLocation("https://www.instagram.com/stories/some_user/");
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

    it("fetches a single story by its media id when no owner id resolves", async () => {
        setLocation("https://www.instagram.com/stories/skogan89/123456789/");
        await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: null, isHighlight: false });
        expect(fetch).toHaveBeenCalledWith(
            "https://i.instagram.com/api/v1/media/123456789/info/", expect.any(Object)
        );
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("expands a single story into its owner's whole reel", async () => {
        setLocation("https://www.instagram.com/stories/skogan89/123456789/");
        const reel = { reels_media: [{ user: { pk: "2000001" }, items: [{ taken_at: 1 }, { taken_at: 2 }] }] };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ user: { pk: "2000001" }, taken_at: 1 }] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => reel });
        vi.stubGlobal("fetch", fetchMock);

        const result = await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: null, isHighlight: false });

        expect(result).toEqual(reel);
        expect(fetchMock.mock.calls[1][0]).toBe("https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=2000001");
    });

    it("keeps the single story when the owner's reel comes back empty", async () => {
        setLocation("https://www.instagram.com/stories/skogan89/123456789/");
        const single = { items: [{ user: { id: "2000001" }, taken_at: 1 }] };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => single })
            .mockResolvedValueOnce({ ok: false, status: 403 })
            .mockResolvedValueOnce({ ok: false, status: 403 });
        vi.stubGlobal("fetch", fetchMock);

        expect(await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: null, isHighlight: false })).toEqual(single);
        // Single story, mobile reel, legacy GraphQL reel. The web GraphQL
        // query is skipped because this page has no lsd/fb_dtsg tokens.
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    // Captured 2026-10-17: the mobile endpoint answers an empty reel map with
    // HTTP 200, which must not count as an answer.
    it("falls back to the web app's GraphQL story query when reels_media is empty", async () => {
        setLocation("https://www.instagram.com/stories/story_user/3000001/");
        for (const content of ['"LSD",[],{"token":"lsd-value"}', '"DTSGInitialData",[],{"token":"dtsg-value"}']) {
            const script = document.createElement("script");
            script.type = "application/json";
            script.textContent = content;
            document.body.appendChild(script);
        }
        document.cookie = "csrftoken=csrf-value";
        const reel = loadFixture<{ require: any }>("story-page-reels-media")
            .require[0][3][0].__bbox.require[0][3][1].__bbox.result;
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ reels: {}, status: "ok" }) })
            .mockResolvedValueOnce({ ok: true, json: async () => reel });
        vi.stubGlobal("fetch", fetchMock);

        const result = await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: "2000001", isHighlight: false });

        expect(result?.reels_media?.[0]?.items).toHaveLength(1);
        const [url, init] = fetchMock.mock.calls[1];
        expect(url).toBe("https://www.instagram.com/api/graphql");
        const body = new URLSearchParams(init.body);
        expect(body.get("doc_id")).toBe("28449850404637481");
        expect(body.get("fb_api_req_friendly_name")).toBe("PolarisStoriesV3ReelPageStandaloneQuery");
        expect(JSON.parse(body.get("variables")!)).toMatchObject({ media_id: "3000001", reel_ids_arr: ["2000001"] });
        document.cookie = "csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    });

    it("loads the single story from the URL when every reel source is empty", async () => {
        setLocation("https://www.instagram.com/stories/story_user/3000001/");
        const single = { items: [{ user: { pk: "2000001" }, taken_at: 1 }] };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ reels: {}, status: "ok" }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { reels_media: [] } }) })
            .mockResolvedValueOnce({ ok: true, json: async () => single });
        vi.stubGlobal("fetch", fetchMock);

        expect(await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: "2000001", isHighlight: false })).toEqual(single);
        expect(fetchMock.mock.calls[2][0]).toBe("https://i.instagram.com/api/v1/media/3000001/info/");
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

    it("uses Instaloader's GraphQL story query if the mobile feed is refused", async () => {
        setLocation("https://www.instagram.com/stories/skogan89/");
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 403 })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { reels_media: [{
                user: { username: "skogan89" },
                items: [{ owner: { username: "skogan89" }, taken_at: 123,
                    display_resources: [{ src: "https://cdn/story.jpg" }],
                    video_resources: [{ src: "https://cdn/story.mp4" }],
                }],
            }] } }) });
        vi.stubGlobal("fetch", fetchMock);
        const result = await fetchDataFromApi({ type: "getReelsMediaFromFeed", id: "123456", isHighlight: false });
        expect(result?.reels_media?.[0]?.items?.[0]).toMatchObject({
            user: { username: "skogan89" },
            image_versions2: { candidates: [{ url: "https://cdn/story.jpg" }] },
            video_versions: [{ url: "https://cdn/story.mp4" }],
        });
        const query = new URL(fetchMock.mock.calls[1][0]);
        expect(query.searchParams.get("query_hash")).toBe("303a4ae99711322310f25250d988f3b7");
        expect(JSON.parse(query.searchParams.get("variables")!)).toEqual({ reel_ids: ["123456"], precomposed_overlay: false });
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

    it("resolves the profile HTML first and matches the username case-insensitively", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(profilePageResponse({
            username: "Lascanaofficial",
            id: "999888777",
            profile_pic_url: "https://scontent.cdninstagram.com/v/username.jpg",
        }));
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toContain("username.jpg");
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain("https://www.instagram.com/lascanaofficial/");
    });

    it("resolves skogan89 through the profile HTML with a numeric pk", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(profilePageResponse({ username: "Skogan89", pk: 999888777 }));
        vi.stubGlobal("fetch", fetchMock);

        expect((await resolveProfile("skogan89")).userId).toBe("999888777");
        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://www.instagram.com/skogan89/"
        );
        expect(fetchMock.mock.calls[0][1]).toMatchObject({
            credentials: "omit",
            headers: { Accept: "text/html" },
        });
    });

    // Captured 2026-10-16: the anonymous profile page no longer embeds any
    // user dict, only the route definition with page_logging.profile_id.
    it("reads the route profile_id from the anonymous profile page without touching the feed", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(htmlResponse(embeddedScript("profile-page-anonymous")));
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("Route_User");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.pk).toBe("999888777");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("ignores the route profile_id of a different user", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(htmlResponse(embeddedScript("profile-page-anonymous")))
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
        vi.stubGlobal("fetch", fetchMock);

        expect((await resolveProfile("someone_else")).userId).toBeNull();
    });

    it("falls through to the username feed only after the profile HTML fails", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 429 })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: [{ user: {
                    pk: "999888777",
                    profile_pic_url: "https://scontent.cdninstagram.com/v/pic.jpg",
                } }] }),
            });
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBe("999888777");
        expect(result.owner?.profile_pic_url).toContain("pic.jpg");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toContain("feed/user/");
        expect(fetchMock.mock.calls[1][0]).toContain("lascanaofficial");
    });

    it("uses the feed owner's id when pk is absent", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(profilePageResponse({ username: "someone_else", id: "111" }))
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ user: { id: 555444333 } }] }) }));

        expect((await resolveProfile("lascanaofficial")).userId).toBe("555444333");
    });

    // Captured 2026-10-16: {"message":"","spam":true,"status":"fail"} is what
    // the username feed now answers for some sessions.
    it("treats a spam-flagged username feed answer as a miss", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(profilePageResponse({ username: "someone_else", id: "111" }))
            .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "", spam: true, status: "fail" }) });
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("returns null values when neither profile HTML nor feed lookup finds the profile", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(profilePageResponse({ username: "someone_else", id: "111" }))
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
        vi.stubGlobal("fetch", fetchMock);

        const result = await resolveProfile("lascanaofficial");

        expect(result.userId).toBeNull();
        expect(result.owner).toBeNull();
    });
});

describe("embedded profiles", () => {
    it("uses pk rather than the opaque page id and skips unrelated or malformed scripts", async () => {
        const response = profilePageResponse({ username: "Skogan89", pk: "123456", id: "opaque-id" });
        const page = new DOMParser().parseFromString(
            '<script type="application/json">bad JSON</script>'+await response.text(), "text/html"
        );
        expect(findEmbeddedProfile(page, "skogan89")?.pk).toBe("123456");
        expect(findEmbeddedProfile(page, "another_user")).toBeNull();
    });

    it("resolves the current page without making an API request", async () => {
        document.body.innerHTML = await profilePageResponse({ username: "skogan89", pk: 123456 }).text();
        vi.stubGlobal("fetch", vi.fn());
        expect((await resolveProfile("skogan89")).userId).toBe("123456");
        expect(fetch).not.toHaveBeenCalled();
        document.body.innerHTML = "";
        vi.unstubAllGlobals();
    });

    // Captured 2026-10-16 from a directly opened /stories/<user>/<id>/ page.
    it("resolves a directly opened story page from its preloaded reel owner", async () => {
        document.body.innerHTML = embeddedScript("story-page-route")+embeddedScript("story-page-reels-media");
        vi.stubGlobal("fetch", vi.fn());
        const result = await resolveProfile("story_user");
        expect(result.userId).toBe("2000001");
        expect(result.owner?.username).toBe("story_user");
        expect(fetch).not.toHaveBeenCalled();
        document.body.innerHTML = "";
        vi.unstubAllGlobals();
    });

    it("reads the StoriesPage route id when only the route definition is embedded", () => {
        const page = new DOMParser().parseFromString(embeddedScript("story-page-route"), "text/html");
        expect(findEmbeddedProfile(page, "story_user")?.pk).toBe("2000001");
        expect(findEmbeddedProfile(page, "another_user")).toBeNull();
    });

    it("does not mistake a username-only object for a user dict", () => {
        const page = new DOMParser().parseFromString(
            '<script type="application/json">{"params":{"username":"story_user"},"id":"not-a-profile"}</script>', "text/html"
        );
        expect(findEmbeddedProfile(page, "story_user")).toBeNull();
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
