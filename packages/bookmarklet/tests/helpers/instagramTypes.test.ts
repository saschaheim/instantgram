import { describe, it, expect } from "vitest";
import { isDownloadableImageLike, isInstagramMediaItem } from "../../src/helpers/instagramTypes";
import { loadFixture } from "../utils/fixtures";

describe("isInstagramMediaItem", () => {
    it("is true for a post item (has image_versions2)", () => {
        const fixture = loadFixture("post-single-image");
        expect(isInstagramMediaItem(fixture.items[0])).toBe(true);
    });

    it("is true for a carousel media item", () => {
        const fixture = loadFixture("post-carousel");
        expect(isInstagramMediaItem(fixture.items[0])).toBe(true);
    });

    it("is true for a reel item (has video_versions)", () => {
        const fixture = loadFixture("reel-single");
        expect(isInstagramMediaItem(fixture.items[0])).toBe(true);
    });

    it("is false for a bare profile-picture-info object (no items/carousel_media/video/image_versions2 keys)", () => {
        const fixture = loadFixture("profile-user-info");
        expect(isInstagramMediaItem(fixture.user.hd_profile_pic_url_info)).toBe(false);
    });

    it("is false for a plain string", () => {
        expect(isInstagramMediaItem("https://example.com/some-video-page-url")).toBe(false);
    });
});

describe("isDownloadableImageLike", () => {
    it("is true for a profile-picture-info object with a url", () => {
        const fixture = loadFixture("profile-user-info");
        expect(isDownloadableImageLike(fixture.user.hd_profile_pic_url_info)).toBe(true);
    });

    it("is false for a plain string", () => {
        expect(isDownloadableImageLike("https://example.com/story-txt-fallback")).toBe(false);
    });

    it("is false for an Instagram media item accessed by object identity but without a top-level url", () => {
        const fixture = loadFixture("post-single-image");
        expect(isDownloadableImageLike(fixture.items[0])).toBe(false);
    });
});
