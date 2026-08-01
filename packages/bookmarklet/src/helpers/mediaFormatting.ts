import { storiesPathPrefix } from "./common";
import { MediaType } from "../model/MediaType";
import { DownloadableMedia, InstagramMediaItem, isDownloadableImageLike, isInstagramMediaItem } from "./instagramTypes";

const buildDatePlaceholders = (date: Date, userName: string): Record<string, string> => ({
    Minute: date.getMinutes().toString().padStart(2, "0"),
    Hour: date.getHours().toString().padStart(2, "0"),
    Day: date.getDate().toString().padStart(2, "0"),
    Month: (date.getMonth() + 1).toString().padStart(2, "0"),
    Year: date.getFullYear().toString(),
    Username: userName,
});

type MediaExtension = "mp4" | "jpg" | "jpeg" | "webp" | "avif";

const getImageExtension = (url: string): Exclude<MediaExtension, "mp4"> => {
    const extension = new URL(url).pathname.toLowerCase().match(/\.(jpe?g|webp|avif)$/)?.[1];
    return extension === "jpeg" || extension === "webp" || extension === "avif" ? extension : "jpg";
};

export const getFormattedFilenameAndUrl = (media: DownloadableMedia, userName: string, template: string, index: number) => {
    if (isDownloadableImageLike(media) && media.url) {
        return { formattedFilename: userName+"."+getImageExtension(media.url), url: media.url };
    }

    if (typeof media === "string") {
        const filename = userFilenameFormatter(template, buildDatePlaceholders(new Date(), userName));
        return { formattedFilename: filename+"_"+(index + 1)+".txt", url: media };
    } else if (isInstagramMediaItem(media)) {
        const date = new Date((media.taken_at ?? Date.now() / 1000) * 1000);
        const filename = userFilenameFormatter(template, buildDatePlaceholders(date, userName));
        const { extension, url } = getImgOrVideoUrl(media);
        return { formattedFilename: filename+"_"+(index + 1)+"."+extension, url };
    } else {
        throw new Error("Unsupported media type");
    }
};

export const getImgOrVideoUrl = (item: InstagramMediaItem): { extension: MediaExtension; url: string } | null => {
    if (item.items) {
        if ("video_versions" in item && item.items[0]?.video_versions?.[0]?.url) {
            return { extension: "mp4", url: item.items[0].video_versions[0].url };
        } else if (item.items[0]?.image_versions2?.candidates?.[0]?.url) {
            const url = item.items[0].image_versions2.candidates[0].url;
            return { extension: getImageExtension(url), url };
        } else {
            console.error('Error: No valid video or image URL found in item.items[0]');
            return null;
        }
    }

    if ("video_versions" in item && item.video_versions?.[0]?.url) {
        return { extension: "mp4", url: item.video_versions[0].url };
    } else if (item.image_versions2?.candidates?.[0]?.url) {
        const url = item.image_versions2.candidates[0].url;
        return { extension: getImageExtension(url), url };
    } else {
        console.error('Error: No valid video or image URL found');
        return null;
    }
};

export const resolveElementMediaType = (mediaArray: InstagramMediaItem) => {
    if (mediaArray.carousel_media) return MediaType.Carousel;
    if (mediaArray.video_dash_manifest || mediaArray.video_duration || mediaArray.video_versions) return MediaType.Video;
    return MediaType.Image;
};

export const userFilenameFormatter = (filename: string, placeholders: Record<string, string>): string => {
    for (const placeholder in placeholders) {
        const regex = new RegExp("{"+placeholder+"}", "g");
        filename = filename.replace(regex, placeholders[placeholder]);
    }
    return filename.replace(/\s+/g, "-").replace(/[^\w-.]/g, "");
};

export const buildProxyDownloadUrl = (url: string, filename: string, version: string, sourceUrl: string): string =>
    "https://instantgram.1337.pictures/download.php?data="+btoa(url)+":"+btoa(filename)+"&s="+encodeURIComponent(sourceUrl)+"&v="+encodeURIComponent(version);

export const wrapInSliderContainer = (modalBody: string) =>
    '<div class="slider-container"><div class="slider">'+modalBody+'</div><div class="slider-controls"></div></div>';

export const resolveUserLink = (rootUrl: string, path: string, userName: string) => {
    if (path.startsWith("/p/") || path.startsWith(storiesPathPrefix)) {
        return rootUrl+"/"+userName+"/";
    } else if (path.startsWith("/reels/")) {
        return rootUrl+"/"+userName+"/reels/";
    } else {
        return rootUrl+"/"+userName;
    }
};
