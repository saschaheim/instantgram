import { Program } from "../App";
import { uiClasses } from "../components/uiTokens";
import localize from "./localize";
import { MediaScanResult } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
import { fetchDataFromApi, findPostId, getIGUsername, resolveUserIdFromSearch } from "./instagramApi";
import { findAD, resolveCurrentStoryIndex } from "./domDetection";
import { findMediaUrl } from "./reactMedia";
import {
    DownloadableMedia,
    InstagramMediaInfoResponse,
    InstagramMediaItem,
    isInstagramMediaItem
} from "./instagramTypes";
import {
    getFormattedFilenameAndUrl,
    getImgOrVideoUrl,
    getMediaElement,
    resolveElementMediaType,
    resolveOverallMediaType,
    resolveUserLink,
    wrapInSliderContainer
} from "./mediaFormatting";
import { isDownloadableImageLike } from "./instagramTypes";

const isStoriesPage = () => window.location.pathname.startsWith("/stories/");
const resolveVideoMuted = (program: Program) => isStoriesPage() ? program.settings.storiesMuted : program.settings.videosMuted;

const buildDownloadDataAttributes = (attributes: Record<string, string | number | undefined>) =>
    Object.entries(attributes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `data-${key}="${String(value)}"`)
        .join(" ");

const buildDownloadMetadataAttributes = (media: DownloadableMedia, userName: string, index: number): string => {
    if (isDownloadableImageLike(media) && media.url) {
        return buildDownloadDataAttributes({
            "direct-url": media.url,
            "static-filename": `${userName}.jpg`,
        });
    }

    if (typeof media === "string") {
        const date = new Date();
        return buildDownloadDataAttributes({
            "direct-url": media,
            username: userName,
            index,
            extension: "txt",
            year: date.getFullYear(),
            month: String(date.getMonth() + 1).padStart(2, "0"),
            day: String(date.getDate()).padStart(2, "0"),
            hour: String(date.getHours()).padStart(2, "0"),
            minute: String(date.getMinutes()).padStart(2, "0"),
        });
    }

    if (isInstagramMediaItem(media)) {
        const date = new Date((media.taken_at ?? Date.now() / 1000) * 1000);
        const mediaUrl = getImgOrVideoUrl(media);
        if (!mediaUrl) {
            return "";
        }
        return buildDownloadDataAttributes({
            "direct-url": mediaUrl.url,
            username: userName,
            index,
            extension: mediaUrl.extension,
            year: date.getFullYear(),
            month: String(date.getMonth() + 1).padStart(2, "0"),
            day: String(date.getDate()).padStart(2, "0"),
            hour: String(date.getHours()).padStart(2, "0"),
            minute: String(date.getMinutes()).padStart(2, "0"),
        });
    }

    return "";
};

export const generateModalBody = async (el: HTMLElement, program: Program): Promise<MediaScanResult> => {
    const isPathMatch = (path: string) => window.location.pathname.startsWith(path);
    let userName = getIGUsername(window.location.href);
    const postId = findPostId(el);
    const userId = isPathMatch("/stories/")
        ? (await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName }))?.data?.user?.id
            ?? (await resolveUserIdFromSearch(userName))
        : null;

    let modalBody = "";
    const mediaInfo = await getMediaInfo(el, postId, userId);
    if (!mediaInfo) {
        return { found: false, errorMessage: "No media info found." };
    }

    if (userName === postId && (isPathMatch("/p/") || isPathMatch("/reels/"))) {
        userName = mediaInfo.items?.[0]?.user?.username;
    } else {
        const userFromReels = mediaInfo.reels_media?.[0]?.user?.username;
        const userFromItems = mediaInfo.items?.[0]?.user?.username;
        userName = userFromReels || userFromItems || userName;
    }

    const userLink = resolveUserLink('https://www.instagram.com', window.location.pathname, userName);

    if (findAD(el, isPathMatch("/stories/"))) {
        if (program.settings.showAds) {
            const targetNode = el.querySelector("video[playsinline]") || el.querySelector('img[draggable]');
            if (!targetNode) return { found: false };

            const mediaUrl = findMediaUrl(el, 'post');
            const mediaType = MediaType.Video;
            const resolvedAdUrl = mediaUrl.mostFrequentUrl || mediaUrl.mediaUrlElements[0]?.url;
            if (!resolvedAdUrl) {
                return { found: false, errorMessage: "No ad media URL found." };
            }
            const { formattedFilename, url } = getFormattedFilenameAndUrl(resolvedAdUrl, userName, program.settings.formattedFilenameInput, 0);
            const mediaElement = getMediaElement(mediaType, url, resolveVideoMuted(program));
            const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`;
            const downloadUrl = program.settings.openInNewTab ? url : encodedUrl;
            const downloadDataAttributes = buildDownloadDataAttributes({
                "direct-url": url,
                "static-filename": formattedFilename,
            });
            modalBody += `
                <div class="slide">
                    ${mediaElement}
                    <a href="${downloadUrl}" ${downloadDataAttributes} class="${uiClasses.modalDb}">${localize("d")}</a>
                </div>`;
            return {
                found: true,
                mediaType: resolveOverallMediaType(),
                mediaInfo,
                modalBody: wrapInSliderContainer(modalBody),
                selectedSliderIndex: 0,
                userName,
                userLink,
            };
        } else {
            return { found: false };
        }
    }

    const itemCount = processMediaInfo(mediaInfo, (media: InstagramMediaItem, index: number) => {
        modalBody = addMediaToBody(modalBody, media, index, userName, program);
    });

    if (itemCount === 0) {
        return { found: false, errorMessage: "No story items returned by Instagram." };
    }

    const sliderHtml = wrapInSliderContainer(modalBody);
    const selectedSliderIndex = resolveCurrentStoryIndex(el);
    return {
        found: true,
        mediaType: resolveOverallMediaType(),
        mediaInfo,
        modalBody: sliderHtml,
        selectedSliderIndex,
        userName,
        userLink,
    };
};

export async function generateModalBodyHelper(
    el: HTMLElement,
    mediaInfo: InstagramMediaInfoResponse,
    userName: string,
    userLink: string,
    program: Program
): Promise<MediaScanResult | null> {
    let modalBody = "";
    let itemCount: number;

    if (program.settings.noMultiStories && mediaInfo.reels_media?.[0]?.items.length > 0) {
        const itemIndex = resolveCurrentStoryIndex(el);
        modalBody = addMediaToBody(modalBody, mediaInfo.reels_media[0].items[itemIndex], itemIndex, userName, program);
        itemCount = 1;
    } else {
        itemCount = processMediaInfo(mediaInfo, (media: InstagramMediaItem, index: number) => {
            modalBody = addMediaToBody(modalBody, media, index, userName, program);
        });
    }

    if (itemCount === 0) {
        return { found: false, errorMessage: "No media items returned by Instagram." };
    }

    const sliderHtml = wrapInSliderContainer(modalBody);
    const selectedSliderIndex = itemCount > 0 ? resolveCurrentStoryIndex(el) : 0;

    return {
        found: true,
        mediaType: resolveOverallMediaType(),
        mediaInfo,
        modalBody: sliderHtml,
        selectedSliderIndex,
        userName,
        userLink,
    };
}

export const addMediaToBody = (modalBody: string, media: DownloadableMedia, index: number, userName: string, program: Program): string => {
    const { formattedFilename, url } = getFormattedFilenameAndUrl(media, userName, program.settings.formattedFilenameInput, index);
    const mediaType = isInstagramMediaItem(media) ? resolveElementMediaType(media) : MediaType.Image;
    const mediaElement = getMediaElement(mediaType, url, resolveVideoMuted(program));
    const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`;
    const downloadUrl = program.settings.openInNewTab ? url : encodedUrl;
    const downloadDataAttributes = buildDownloadMetadataAttributes(media, userName, index);

    return modalBody + `
        <div class="slide">
            ${mediaElement}
            <a href="${downloadUrl}"
               ${downloadDataAttributes}
               ${program.settings.openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} 
               class="${uiClasses.modalDb}">${localize("d")}
            </a>
        </div>`;
};

export const getMediaInfo = async (
    el: HTMLElement,
    postId: string | null,
    userId: string | null
): Promise<InstagramMediaInfoResponse | null> => {
    if (!postId) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId, isHighlight: false });
    }

    if (window.location.pathname.startsWith("/stories/highlights/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: null, isHighlight: true });
    } else if (window.location.pathname.startsWith("/stories/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId, isHighlight: false });
    } else {
        return await fetchDataFromApi({ type: 'getMediaFromInfo', articleNode: el });
    }
};

export const processMediaInfo = (
    mediaInfo: InstagramMediaInfoResponse,
    // eslint-disable-next-line no-unused-vars
    callback: (...args: [InstagramMediaItem, number, number]) => void
): number => {
    let count = 0;

    if (mediaInfo.reels_media?.[0]?.items) {
        count = mediaInfo.reels_media[0].items.length;
        mediaInfo.reels_media[0].items.forEach((media, index) => {
            callback(media, index, count);
        });
    } else if (mediaInfo.items?.[0]?.carousel_media) {
        count = mediaInfo.items[0].carousel_media.length;
        mediaInfo.items[0].carousel_media.forEach((media, index) => {
            callback(media, index, count);
        });
    } else if (mediaInfo.items?.[0]) {
        count = 1;
        callback(mediaInfo.items[0], 0, count);
    } else if (mediaInfo.user?.hd_profile_pic_url_info?.url) {
        count = 1;
        callback(mediaInfo.user.hd_profile_pic_url_info, 0, count);
    }

    return count;
};
