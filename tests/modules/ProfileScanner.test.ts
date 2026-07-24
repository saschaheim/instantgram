import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProfileScanner } from "../../src/modules/ProfileScanner";
import { loadFixture } from "../utils/fixtures";
import { createTestProgram } from "../utils/program";
import { setLocation } from "../utils/location";

// ProfileScanner -> modalMedia.ts -> localize.ts -> src/index.ts (circular
// side-effecting entry point). Stub localize so only the real module we
// care about (modalMedia's generateModalBodyHelper) gets exercised.
vi.mock("../../src/helpers/localize", () => ({ default: (key: string) => key }));

const { fetchDataFromApi } = vi.hoisted(() => ({ fetchDataFromApi: vi.fn() }));

vi.mock("../../src/helpers/instagramApi", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../src/helpers/instagramApi")>();
    return { ...actual, fetchDataFromApi };
});

describe("ProfileScanner", () => {
    const program = createTestProgram();

    beforeEach(() => {
        fetchDataFromApi.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reports found: false when the path does not look like a profile page", async () => {
        setLocation("https://www.instagram.com/p/ABC123abcde/");
        const result = await new ProfileScanner().execute(program);
        expect(result?.found).toBe(false);
    });

    const stubAppId = () => {
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
    };

    it("reports found: true with one slide when the profile has an hd_profile_pic_url_info", async () => {
        setLocation("https://www.instagram.com/profile_user/");
        // web_profile_info is switched off (WEB_PROFILE_INFO_ENABLED), so the
        // id is resolved via the feed fallback (stubbed global fetch) first.
        stubAppId();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { pk: "3000001" } }] }),
        }));
        fetchDataFromApi.mockResolvedValueOnce(loadFixture("profile-user-info"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect((result?.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("falls back to profile_pic_url_hd when hd_profile_pic_url_info is missing", async () => {
        setLocation("https://www.instagram.com/legacy_pic_user/");
        stubAppId();
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ items: [{ user: { pk: "3000002" } }] }),
        }));
        fetchDataFromApi.mockResolvedValueOnce(loadFixture("profile-user-info-fallback"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect((result?.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("reports found: false when both the feed fallback and the search fallback find no user id", async () => {
        setLocation("https://www.instagram.com/ghost_user/");
        // No script tag with an app id -> findAppId() returns null for both
        // fallbacks, so they bail out without making a request.
        document.body.innerHTML = "";

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/userID/i);
    });

    // The actual fix for https://github.com/saschaheim/instantgram/issues/45,
    // not just a graceful failure: when web_profile_info is switched off and
    // the feed fallback finds nothing, Instagram's search endpoint still
    // resolves the account, and the profile picture should load normally
    // instead of giving up.
    it("resolves the profile via the search fallback when the feed fallback has no user id", async () => {
        setLocation("https://www.instagram.com/ghost_user/");
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ users: [{ user: { username: "ghost_user", id: "555444333" } }] }),
            });
        vi.stubGlobal("fetch", fetchMock);

        fetchDataFromApi.mockResolvedValueOnce(loadFixture("profile-user-info"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(fetchDataFromApi).toHaveBeenCalledWith({ type: "getUserFromInfo", userId: "555444333" });
    });

    // Confirmed via a real captured response (see
    // tools/instagram-fixtures/output/profile-usernameinfo-artem_pakhniuk.json
    // vs. the web-style /users/{id}/info/ response for the same account):
    // some business/creator accounts get a response from getUserFromInfo
    // with no profile_pic_url* field at all, even once the id resolves
    // fine via the feed fallback. The feed owner's plain profile_pic_url
    // must still be used as a last-resort source.
    it("resolves the profile via the feed fallback's plain profile_pic_url when getUserFromInfo has no profile pic fields", async () => {
        setLocation("https://www.instagram.com/creator_user/");
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                items: [{ user: { pk: "777666555", profile_pic_url: "https://scontent.cdninstagram.com/v/feed_owner_pic.jpg" } }],
            }),
        }));

        fetchDataFromApi.mockResolvedValueOnce({ user: { id: "777666555", username: "creator_user" } });

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(fetchDataFromApi).toHaveBeenCalledWith({ type: "getUserFromInfo", userId: "777666555" });
        expect(result?.modalBody).toContain("feed_owner_pic.jpg");
    });
});
