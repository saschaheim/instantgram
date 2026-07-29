import { Program } from "../App";
import localize from "./localize";
import { MediaScanResult, MediaSlide } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
import { fetchDataFromApi, findPostId, getIGUsername, resolveProfile } from "./instagramApi";
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
    resolveElementMediaType,
    resolveUserLink
} from "./mediaFormatting";

type ProfilePictureInfo = {
    url: string;
    width?: number;
    height?: number;
};

const createMediaSlide = (media: DownloadableMedia, index: number, userName: string, program: Program): MediaSlide => {
    const { formattedFilename, url } = getFormattedFilenameAndUrl(media, userName, program.settings.formattedFilenameInput, index);
    const mediaType = isInstagramMediaItem(media) ? resolveElementMediaType(media) : MediaType.Image;

    return {
        mediaType,
        mediaUrl: url,
        downloadLabel: localize("d"),
        downloadAttributes: {
            "data-direct-url": url,
            "data-static-filename": formattedFilename,
        },
    };
};

export const resolveProfilePictureInfo = (...sources: Array<unknown>): ProfilePictureInfo | null => {
    for (const source of sources) {
        if (!source || typeof source !== "object") {
            continue;
        }
        const candidate = source as {
            profile_pic_url_hd?: string;
            profile_pic_url?: string;
            hd_profile_pic_url_info?: ProfilePictureInfo;
        };
        if (candidate.hd_profile_pic_url_info?.url) {
            return candidate.hd_profile_pic_url_info;
        }
        const fallbackUrl = candidate.profile_pic_url_hd || candidate.profile_pic_url;
        if (fallbackUrl) {
            return { url: fallbackUrl };
        }
    }
    return null;
};

const buildResult = (
    slides: MediaSlide[],
    userName: string,
    userLink: string,
    selectedSliderIndex: number
): MediaScanResult => ({
    found: true,
    slides,
    selectedSliderIndex,
    userName,
    userLink,
});

const createAdSlide = (resolvedAdUrl: string, userName: string, program: Program): MediaSlide => {
    const { formattedFilename, url } = getFormattedFilenameAndUrl(resolvedAdUrl, userName, program.settings.formattedFilenameInput, 0);
    return {
        mediaType: MediaType.Video,
        mediaUrl: url,
        downloadLabel: localize("d"),
        downloadAttributes: {
            "data-direct-url": url,
            "data-static-filename": formattedFilename,
        },
    };
};

export const generateModalBody = async (el: HTMLElement, program: Program): Promise<MediaScanResult> => {
    const isPathMatch = (path: string) => window.location.pathname.startsWith(path);
    let userName = getIGUsername(window.location.href);
    const postId = findPostId(el);
    const userId = isPathMatch("/stories/") ? (await resolveProfile(userName)).userId : null;

    const mediaInfo = await getMediaInfo(el, postId, userId);
    if (!mediaInfo) {
        return { found: false };
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
        if (!program.settings.showAds) {
            return { found: false };
        }
        const targetNode = el.querySelector("video[playsinline]") || el.querySelector('img[draggable]');
        if (!targetNode) return { found: false };
        const mediaUrl = findMediaUrl(el, 'post');
        const resolvedAdUrl = mediaUrl.mostFrequentUrl || mediaUrl.mediaUrlElements[0]?.url;
        if (!resolvedAdUrl) {
            return { found: false };
        }
        return buildResult([createAdSlide(resolvedAdUrl, userName, program)], userName, userLink, 0);
    }

    return (await generateModalBodyHelper(el, mediaInfo, userName, userLink, program))
        || { found: false };
};

export async function generateModalBodyHelper(
    el: HTMLElement,
    mediaInfo: InstagramMediaInfoResponse,
    userName: string,
    userLink: string,
    program: Program
): Promise<MediaScanResult | null> {
    const slides: MediaSlide[] = [];
    const storyItems = mediaInfo.reels_media?.[0]?.items;

    if (program.settings.noMultiStories && storyItems?.length) {
        const itemIndex = resolveCurrentStoryIndex(el);
        slides.push(createMediaSlide(storyItems[itemIndex], itemIndex, userName, program));
    } else {
        processMediaInfo(mediaInfo, (media: InstagramMediaItem, index: number) => {
            slides.push(createMediaSlide(media, index, userName, program));
        });
    }

    if (!slides.length) {
        return { found: false };
    }

    return buildResult(slides, userName, userLink, resolveCurrentStoryIndex(el));
}

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
