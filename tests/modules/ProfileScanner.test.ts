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

    it("reports found: true with one slide when the profile has an hd_profile_pic_url_info", async () => {
        setLocation("https://www.instagram.com/profile_user/");
        fetchDataFromApi
            .mockResolvedValueOnce(loadFixture("profile-web-info"))
            .mockResolvedValueOnce(loadFixture("profile-user-info"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect((result?.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("falls back to profile_pic_url_hd when hd_profile_pic_url_info is missing", async () => {
        setLocation("https://www.instagram.com/legacy_pic_user/");
        fetchDataFromApi
            .mockResolvedValueOnce({ data: { user: { id: "3000002", username: "legacy_pic_user" } } })
            .mockResolvedValueOnce(loadFixture("profile-user-info-fallback"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect((result?.modalBody?.match(/class="slide"/g) || []).length).toBe(1);
    });

    it("reports found: false when both web_profile_info and the search fallback find no user id", async () => {
        setLocation("https://www.instagram.com/ghost_user/");
        // No script tag with an app id -> resolveUserIdFromSearch's findAppId()
        // returns null, so it bails out without making a request.
        document.body.innerHTML = "";
        fetchDataFromApi.mockResolvedValueOnce({ data: { user: {} } });

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(false);
        expect(result?.errorMessage).toMatch(/userID/i);
    });

    // The actual fix for https://github.com/saschaheim/instantgram/issues/45,
    // not just a graceful failure: when web_profile_info returns no user id
    // (e.g. the confirmed ig_business_category_subvertical schema error) but
    // Instagram's search endpoint still resolves the account, the profile
    // picture should load normally instead of giving up.
    it("resolves the profile via the search fallback when web_profile_info has no user id", async () => {
        setLocation("https://www.instagram.com/ghost_user/");
        document.body.innerHTML = "";
        const script = document.createElement("script");
        script.type = "application/json";
        script.textContent = '"X-IG-App-ID":"123456789"';
        document.body.appendChild(script);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ users: [{ user: { username: "ghost_user", id: "555444333" } }] }),
        }));

        fetchDataFromApi
            .mockResolvedValueOnce({ data: { user: {} } })
            .mockResolvedValueOnce(loadFixture("profile-user-info"));

        const result = await new ProfileScanner().execute(program);

        expect(result?.found).toBe(true);
        expect(fetchDataFromApi).toHaveBeenCalledWith({ type: "getUserFromInfo", userId: "555444333" });
    });
});
