import { Program } from "../App";
import { storiesHighlightsPathPrefix, storiesPathPrefix } from "./common";
import localize from "./localize";
import { MediaScanResult, MediaSlide } from "../model/MediaScanResult";
import { MediaType } from "../model/MediaType";
import { fetchDataFromApi, findPostId, getIGUsername, resolveProfile } from "./instagramApi";
import { findAD, resolveCurrentStoryIndex } from "./domDetection";
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

const FIREFOX_LITE = process.env.FIREFOX_LITE as unknown as boolean ?? false;

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

// Widths for the url-only fields. The CDN encodes the resize in the url's
// `stp` param (`dst-jpg_s320x320_tt6`), which is the real size regardless of
// which field it came from -- profile_pic_url_hd is 1080 for a public
// account but only 320 for a private one. No size token means no resize,
// i.e. the full-size original.
const fullSizeWidth = 1080;
const thumbnailWidth = 150;
const widthFromUrl = (url: string): number => Number(url.match(/_s(\d+)x\d+/)?.[1]) || fullSizeWidth;

/**
 * Picks the largest profile picture across every source. The size-suffixed
 * CDN urls can't be upgraded by hand (the `oh` signature covers the `stp`
 * param, so a stripped url 403s), so the only way to stay HD is to compare
 * what the APIs actually hand back -- and no field name is a reliable
 * ranking: hd_profile_pic_url_info is the full-size original from the
 * profile-page graphql query but only 150px in the feed/search fallbacks,
 * which carry their bigger sizes in hd_profile_pic_versions instead. Ties
 * keep the earliest source.
 */
export const resolveProfilePictureInfo = (...sources: Array<unknown>): ProfilePictureInfo | null => {
    if (FIREFOX_LITE) {
        for (const source of sources) {
            if (source && typeof source === "object") {
                const candidate = source as { profile_pic_url_hd?: string; profile_pic_url?: string; hd_profile_pic_url_info?: ProfilePictureInfo };
                if (candidate.hd_profile_pic_url_info?.url) return candidate.hd_profile_pic_url_info;
                const url = candidate.profile_pic_url_hd || candidate.profile_pic_url;
                if (url) return { url };
            }
        }
        return null;
    }

    let best: ProfilePictureInfo | null = null;
    let bestWidth = -1;

    const consider = (picture: ProfilePictureInfo | undefined, cap = fullSizeWidth) => {
        if (!picture?.url) {
            return;
        }
        const width = Math.min(picture.width ?? Infinity, widthFromUrl(picture.url), cap);
        if (width > bestWidth) {
            best = picture;
            bestWidth = width;
        }
    };

    for (const source of sources) {
        if (!source || typeof source !== "object") {
            continue;
        }
        const candidate = source as {
            profile_pic_url_hd?: string;
            profile_pic_url?: string;
            hd_profile_pic_url_info?: ProfilePictureInfo;
            hd_profile_pic_versions?: ProfilePictureInfo[];
        };
        consider(candidate.hd_profile_pic_url_info);
        candidate.hd_profile_pic_versions?.forEach(version => consider(version));
        consider(candidate.profile_pic_url_hd ? { url: candidate.profile_pic_url_hd } : undefined);
        // profile_pic_url is always the thumbnail, even when the url carries
        // no size token (the anonymous default avatar).
        consider(candidate.profile_pic_url ? { url: candidate.profile_pic_url } : undefined, thumbnailWidth);
    }

    return best;
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

export const generateModalBody = async (el: HTMLElement, program: Program): Promise<MediaScanResult> => {
    const isPathMatch = (path: string) => window.location.pathname.startsWith(path);
    if (findAD(el)) {
        return { found: false, errorMessage: localize("a.ie") };
    }
    let userName = getIGUsername(window.location.href);
    const postId = findPostId(el);
    const userId = isPathMatch(storiesPathPrefix) ? (await resolveProfile(userName)).userId : null;

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

    if (window.location.pathname.startsWith(storiesHighlightsPathPrefix)) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: null, isHighlight: true });
    } else if (window.location.pathname.startsWith(storiesPathPrefix)) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId, isHighlight: false });
    } else {
        return await fetchDataFromApi({ type: 'getMediaFromInfo', articleNode: el });
    }
};

export const processMediaInfo = (
    mediaInfo: InstagramMediaInfoResponse,
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
