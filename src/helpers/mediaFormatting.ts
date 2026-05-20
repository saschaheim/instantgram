import { MediaType } from "../model/MediaType";
import { DownloadableMedia, InstagramMediaItem, isDownloadableImageLike, isInstagramMediaItem } from "./instagramTypes";

export const getFormattedFilenameAndUrl = (media: DownloadableMedia, userName: string, template: string, index: number) => {
    if (isDownloadableImageLike(media) && media.url) {
        return { formattedFilename: `${userName}.jpg`, url: media.url };
    }

    if (typeof media === "string") {
        const date = new Date();
        const placeholders: Record<string, string> = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName,
        };
        const filename = userFilenameFormatter(template, placeholders);
        return { formattedFilename: `${filename}_${index + 1}.txt`, url: media };
    } else if (isInstagramMediaItem(media)) {
        const date = new Date((media.taken_at ?? Date.now() / 1000) * 1000);
        const placeholders: Record<string, string> = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName,
        };
        const filename = userFilenameFormatter(template, placeholders);
        const { extension, url } = getImgOrVideoUrl(media);
        return { formattedFilename: `${filename}_${index + 1}.${extension}`, url };
    } else {
        throw new Error("Unsupported media type");
    }
};

export const getImgOrVideoUrl = (item: InstagramMediaItem): { extension: "mp4" | "jpg"; url: string } | null => {
    if (item.items) {
        if ("video_versions" in item && item.items[0]?.video_versions?.[0]?.url) {
            return { extension: "mp4", url: item.items[0].video_versions[0].url };
        } else if (item.items[0]?.image_versions2?.candidates?.[0]?.url) {
            return { extension: "jpg", url: item.items[0].image_versions2.candidates[0].url };
        } else {
            console.error('Error: No valid video or image URL found in item.items[0]');
            return null;
        }
    }

    if ("video_versions" in item && item.video_versions?.[0]?.url) {
        return { extension: "mp4", url: item.video_versions[0].url };
    } else if (item.image_versions2?.candidates?.[0]?.url) {
        return { extension: "jpg", url: item.image_versions2.candidates?.[0]?.url };
    } else {
        console.error('Error: No valid video or image URL found');
        return null;
    }
};

export const getMediaElement = (mediaType: MediaType, url: string, muted: boolean): string => {
    return mediaType === MediaType.Video
        ? `<video style="background:black;" height="450" data-media-src="${url}" controls preload="none"${muted ? " muted" : ""}></video>`
        : `<img data-media-src="${url}" loading="lazy" decoding="async" />`;
};

export const resolveElementMediaType = (mediaArray: InstagramMediaItem) => {
    if (mediaArray.carousel_media) return MediaType.Carousel;
    if (mediaArray.video_dash_manifest || mediaArray.video_duration || mediaArray.video_versions) return MediaType.Video;
    return MediaType.Image;
};

export const resolveOverallMediaType = () => {
    return MediaType.UNDEFINED;
};

export const userFilenameFormatter = (filename: string, placeholders: Record<string, string>): string => {
    for (const placeholder in placeholders) {
        const regex = new RegExp(`{${placeholder}}`, "g");
        filename = filename.replace(regex, placeholders[placeholder]);
    }
    return filename.replace(/\s+/g, "-").replace(/[^\w-.]/g, "");
};

export const wrapInSliderContainer = (modalBody: string) =>
    `<div class="slider-container"><div class="slider">${modalBody}</div><div class="slider-controls"></div></div>`;

export const resolveUserLink = (rootUrl: string, path: string, userName: string) => {
    if (path.startsWith("/p/") || path.startsWith("/stories/")) {
        return `${rootUrl}/${userName}/`;
    } else if (path.startsWith("/reels/")) {
        return `${rootUrl}/${userName}/reels/`;
    } else {
        return `${rootUrl}/${userName}`;
    }
};
