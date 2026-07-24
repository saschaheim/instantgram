import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// localize.ts imports `program` from src/index.ts, the browser entry point,
// which runs page-setup side effects at import time (fine in the real
// rollup bundle, but circular in a plain Node/Vite module graph). Stub it so
// importing the real modalMedia.ts doesn't drag src/index.ts in.
vi.mock("../../src/helpers/localize", () => ({ default: (key: string) => key }));

import { processMediaInfo, generateModalBody, generateModalBodyHelper } from "../../src/helpers/modalMedia";
import { InstagramMediaItem } from "../../src/helpers/instagramTypes";
import { loadFixture } from "../utils/fixtures";
import { createTestProgram } from "../utils/program";
import { setLocation } from "../utils/location";

describe("processMediaInfo", () => {
    it("processes a single-image post (items[0])", () => {
        const fixture = loadFixture("post-single-image");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(1);
        expect(seen).toHaveLength(1);
        expect(seen[0].image_versions2?.candidates?.[0]?.url).toBe(
            "https://scontent.cdninstagram.com/v/photo_1080x1350.jpg"
        );
    });

    // tests/fixtures/real-media-info-post.json is real captured data: a
    // successful (status: "ok") /media/<id>/info/ response for the
    // instantgram_bookmarklet account's own in-app changelog post, seen live
    // in the "fetchChangelog" network call. Irrelevant noise fields (internal
    // tracking tokens, ad-eligibility flags, etc.) were trimmed, but every
    // field our code reads is verbatim from the real response.
    it("processes a real captured single-image post response", () => {
        const fixture = loadFixture("real-media-info-post");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(1);
        expect(seen[0].user?.username).toBe("instantgram_bookmarklet");
        expect(seen[0].image_versions2?.candidates?.[0]?.url).toContain(
            "703260968_18104119682513414_2575092306040912564_n.jpg"
        );
    });

    it("processes a carousel post (items[0].carousel_media)", () => {
        const fixture = loadFixture("post-carousel");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(3);
        expect(seen).toHaveLength(3);
        expect(seen[1].video_versions?.[0]?.url).toBe(
            "https://scontent.cdninstagram.com/v/carousel_slide_2.mp4"
        );
    });

    it("processes a reel (items[0], video fields present)", () => {
        const fixture = loadFixture("reel-single");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(1);
        expect(seen[0].video_duration).toBe(27.9);
        expect(seen[0].video_versions?.[0]?.url).toContain("reel_720p.mp4");
    });

    it("processes a single-item story (reels_media[0].items)", () => {
        const fixture = loadFixture("story-single");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(1);
        expect(seen[0].image_versions2?.candidates?.[0]?.url).toContain("story_frame.jpg");
    });

    it("processes a multi-item story (reels_media[0].items)", () => {
        const fixture = loadFixture("story-multi");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(3);
        expect(seen[1].video_versions?.[0]?.url).toContain("story_slide_2.mp4");
    });

    // tests/fixtures/profile-user-info.json is real captured data: a live
    // usernameinfo/ response fetched via tools/instagram-fixtures for the
    // account from issue #45's follow-up report, trimmed to the fields our
    // code reads.
    it("processes a profile picture fallback (user.hd_profile_pic_url_info)", () => {
        const fixture = loadFixture("profile-user-info");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(1);
        expect(seen[0].url).toContain("587552705_18547936279062074_3784513351514396768_n.jpg");
    });

    // Regression coverage for https://github.com/saschaheim/instantgram/issues/45:
    // Instagram can return reels_media as an empty array for a story URL.
    it("returns count 0 when reels_media is an empty array (issue #45: reel missing entirely)", () => {
        const fixture = loadFixture("story-empty-no-reel");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(0);
        expect(seen).toHaveLength(0);
    });

    // Regression coverage for https://github.com/saschaheim/instantgram/issues/45:
    // Instagram can return a reel entry whose `items` array is present but empty
    // (e.g. an expired story). Because `items` is truthy, this must not silently
    // fall through to another branch that "guesses" media -- it must report 0.
    it("returns count 0 when the reel's items array is empty (issue #45: expired/empty story)", () => {
        const fixture = loadFixture("story-empty-items");
        const seen: InstagramMediaItem[] = [];
        const count = processMediaInfo(fixture, (media) => seen.push(media));

        expect(count).toBe(0);
        expect(seen).toHaveLength(0);
    });
});

describe("generateModalBody", () => {
    const program = createTestProgram();

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
        document.body.innerHTML = "";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const stubAppId = () => {
        // findAppId scans body > script textContent for this pattern. Use a
        // non-JS type so jsdom doesn't try to execute the (non-JS) content.
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
    };

    const mockApiResponse = (body: unknown) => {
        (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => body,
        });
    };

    it("reports found: true with one slide for a single-image post", async () => {
        setLocation("https://www.instagram.com/p/ABC123abcde/");
        stubAppId();
        mockApiResponse(loadFixture("post-single-image"));

        const article = document.createElement("article");
        article.innerHTML = '<a href="/p/ABC123abcde/">post</a>';

        const result = await generateModalBody(article, program);

        expect(result.found).toBe(true);
        expect((result.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("reports found: true with three slides for a carousel post", async () => {
        setLocation("https://www.instagram.com/p/CAROUSEL01/");
        stubAppId();
        mockApiResponse(loadFixture("post-carousel"));

        const article = document.createElement("article");
        article.innerHTML = '<a href="/p/CAROUSEL01/">post</a>';

        const result = await generateModalBody(article, program);

        expect(result.found).toBe(true);
        expect((result.modalBody?.match(/class="slide"/g) || []).length).toBe(3);
    });

    it("reports found: false (not a broken empty slider) when a story's reel has zero items", async () => {
        setLocation("https://www.instagram.com/stories/expired_story_user/123456789/");
        stubAppId();
        // First call: getUserInfoFromWebProfile (resolves userId), second call: reels_media fetch.
        (fetch as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ ok: true, json: async () => loadFixture("profile-web-info") })
            .mockResolvedValueOnce({ ok: true, json: async () => loadFixture("story-empty-items") });

        const container = document.createElement("div");

        const result = await generateModalBody(container, program);

        // This is the exact regression from issue #45: previously this returned
        // found: true with an empty modalBody, rendering an empty slider shell.
        expect(result.found).toBe(false);
        expect(result.modalBody).toBeUndefined();
    });

    it("reports found: true with one slide for a single-item story", async () => {
        setLocation("https://www.instagram.com/stories/story_user/123456789/");
        stubAppId();
        (fetch as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ user: { pk: "3000001" } }] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => loadFixture("story-single") });

        const container = document.createElement("div");
        const result = await generateModalBody(container, program);

        expect(result.found).toBe(true);
        expect((result.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    // Regression coverage for https://github.com/saschaheim/instantgram/issues/45.
    // tests/fixtures/web-profile-info-error.json is a verbatim, live-captured
    // response body: a real authenticated GET to
    // https://i.instagram.com/api/v1/users/web_profile_info/?username=lascanaofficial
    // returned HTTP 400 with exactly this body (confirmed twice from a real
    // logged-in session) -- an Instagram-side schema removal
    // ("ig_business_category_subvertical"), not an auth/CORS issue. That
    // endpoint is unreliable enough that it's now switched off entirely (see
    // WEB_PROFILE_INFO_ENABLED) rather than attempted and fallen back from.
    // The code used to also silently treat "no id" as "this must be a
    // highlight" and fire a second, nonsensical
    // `reel_ids=highlight%3A<mediaId>` request, which Instagram answers with
    // an empty reels_media list -- reproducing the empty-slider bug from a
    // different angle. It must now fail fast after the fallbacks instead of
    // guessing.
    it("reports found: false when the feed fallback and the search fallback both find nothing (no bogus highlight query)", async () => {
        setLocation("https://www.instagram.com/stories/lascanaofficial/123456789/");
        stubAppId();
        const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) });

        const container = document.createElement("div");
        const result = await generateModalBody(container, program);

        expect(result.found).toBe(false);
        // web_profile_info is switched off, so only the feed fallback, then
        // the search fallback are tried -- and no reels_media request
        // (highlight-prefixed or otherwise), since no id was resolved.
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toContain("feed/user/");
        expect(fetchMock.mock.calls[1][0]).toContain("topsearch");
    });

    // The actual fix, not just a graceful failure: with web_profile_info
    // switched off (real, confirmed error above), the feed fallback resolves
    // the account id directly and the story should load normally.
    it("resolves the story via the feed fallback", async () => {
        setLocation("https://www.instagram.com/stories/lascanaofficial/123456789/");
        stubAppId();
        const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ items: [{ user: { pk: "999888777" } }] }),
            })
            .mockResolvedValueOnce({ ok: true, json: async () => loadFixture("story-single") });

        const container = document.createElement("div");
        const result = await generateModalBody(container, program);

        expect(result.found).toBe(true);
        expect((result.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toContain("feed/user/");
        expect(fetchMock.mock.calls[1][0]).toContain("reel_ids=999888777");
    });

    // Confirms the search fallback still works as a second-level fallback
    // when the feed fallback finds nothing.
    it("resolves the story via the search fallback when the feed fallback finds nothing", async () => {
        setLocation("https://www.instagram.com/stories/lascanaofficial/123456789/");
        stubAppId();
        const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ users: [{ user: { username: "lascanaofficial", id: "999888777" } }] }),
            })
            .mockResolvedValueOnce({ ok: true, json: async () => loadFixture("story-single") });

        const container = document.createElement("div");
        const result = await generateModalBody(container, program);

        expect(result.found).toBe(true);
        expect((result.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[2][0]).toContain("reel_ids=999888777");
    });
});

describe("generateModalBodyHelper", () => {
    const program = createTestProgram();

    it("reports found: true for a profile picture response", async () => {
        const fixture = loadFixture("profile-user-info");
        const result = await generateModalBodyHelper(
            null as unknown as HTMLElement,
            fixture,
            "profile_user",
            "https://www.instagram.com/profile_user/",
            program
        );

        expect(result?.found).toBe(true);
        expect((result?.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("reports found: false when given a media response with no usable items", async () => {
        const result = await generateModalBodyHelper(
            null as unknown as HTMLElement,
            {},
            "nobody",
            "https://www.instagram.com/nobody/",
            program
        );

        expect(result?.found).toBe(false);
    });
});
