import { describe, it, expect } from "vitest";
import {
    getImgOrVideoUrl,
    getFormattedFilenameAndUrl,
    resolveElementMediaType,
    userFilenameFormatter,
    wrapInSliderContainer,
    resolveUserLink,
} from "../../src/helpers/mediaFormatting";
import { MediaType } from "../../src/model/MediaType";
import { loadFixture } from "../utils/fixtures";

describe("getImgOrVideoUrl", () => {
    it("picks the image url for an image-only item", () => {
        const item = loadFixture("post-single-image").items[0];
        expect(getImgOrVideoUrl(item)).toEqual({
            extension: "jpg",
            url: "https://scontent.cdninstagram.com/v/photo_1080x1350.jpg",
        });
    });

    it("picks the video url for a video item", () => {
        const item = loadFixture("reel-single").items[0];
        expect(getImgOrVideoUrl(item)).toEqual({
            extension: "mp4",
            url: "https://scontent.cdninstagram.com/v/reel_720p.mp4",
        });
    });

    it("returns null when neither image nor video candidates are present", () => {
        expect(getImgOrVideoUrl({})).toBeNull();
    });
});

describe("resolveElementMediaType", () => {
    it("classifies a carousel item", () => {
        const item = loadFixture("post-carousel").items[0];
        expect(resolveElementMediaType(item)).toBe(MediaType.Carousel);
    });

    it("classifies a video item (video_duration present)", () => {
        const item = loadFixture("reel-single").items[0];
        expect(resolveElementMediaType(item)).toBe(MediaType.Video);
    });

    it("classifies a plain image item", () => {
        const item = loadFixture("post-single-image").items[0];
        expect(resolveElementMediaType(item)).toBe(MediaType.Image);
    });
});

describe("getFormattedFilenameAndUrl", () => {
    it("formats a filename for an Instagram media item using the template placeholders", () => {
        const item = loadFixture("post-single-image").items[0];
        const { formattedFilename, url } = getFormattedFilenameAndUrl(
            item,
            "someuser",
            "{Username}_{Year}",
            0
        );

        expect(url).toBe("https://scontent.cdninstagram.com/v/photo_1080x1350.jpg");
        expect(formattedFilename).toMatch(/^someuser_\d{4}_1\.jpg$/);
    });

    it("uses a static .jpg filename for a downloadable-image-like object (profile picture)", () => {
        const pic = loadFixture("profile-user-info").user.hd_profile_pic_url_info;
        const { formattedFilename, url } = getFormattedFilenameAndUrl(pic, "someuser", "{Username}", 0);

        expect(formattedFilename).toBe("someuser.jpg");
        expect(url).toBe(pic.url);
    });
});

describe("userFilenameFormatter", () => {
    it("substitutes placeholders and strips unsafe characters", () => {
        const result = userFilenameFormatter("{Username}__{Year}-{Month}-{Day}", {
            Username: "some user!",
            Year: "2026",
            Month: "07",
            Day: "23",
        });

        expect(result).toBe("some-user__2026-07-23");
    });
});

describe("wrapInSliderContainer", () => {
    it("wraps the given body HTML in the slider container markup", () => {
        const html = wrapInSliderContainer("<div class=\"slide\">x</div>");
        expect(html).toContain("slider-container");
        expect(html).toContain("<div class=\"slide\">x</div>");
    });

    it("still emits the slider shell even for an empty body (documents the issue #45 failure mode this helper alone cannot prevent)", () => {
        const html = wrapInSliderContainer("");
        expect(html).toContain("slider-container");
    });
});

describe("resolveUserLink", () => {
    it("builds a plain profile link for a post path", () => {
        expect(resolveUserLink("https://www.instagram.com", "/p/ABC123/", "someuser")).toBe(
            "https://www.instagram.com/someuser/"
        );
    });

    it("builds a reels-scoped profile link for a reels path", () => {
        expect(resolveUserLink("https://www.instagram.com", "/reels/ABC123/", "someuser")).toBe(
            "https://www.instagram.com/someuser/reels/"
        );
    });

    it("builds a plain profile link for a stories path", () => {
        expect(resolveUserLink("https://www.instagram.com", "/stories/someuser/123/", "someuser")).toBe(
            "https://www.instagram.com/someuser/"
        );
    });
});
