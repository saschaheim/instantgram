export interface InstagramMediaCandidate {
    url?: string;
}

export interface InstagramImageVersions {
    candidates?: InstagramMediaCandidate[];
}

export interface InstagramVideoVersion {
    url?: string;
}

export interface InstagramUserSummary {
    id?: string;
    username?: string;
    profile_pic_url_hd?: string;
    hd_profile_pic_url_info?: {
        width?: number;
        height?: number;
        url?: string;
    };
}

export interface InstagramMediaItem {
    taken_at?: number;
    width?: number;
    height?: number;
    url?: string;
    user?: InstagramUserSummary;
    items?: InstagramMediaItem[];
    carousel_media?: InstagramMediaItem[];
    video_versions?: InstagramVideoVersion[];
    image_versions2?: InstagramImageVersions;
    video_dash_manifest?: string;
    video_duration?: number;
}

export interface InstagramReelMedia {
    user?: InstagramUserSummary;
    items?: InstagramMediaItem[];
}

export interface InstagramMediaInfoResponse {
    data?: {
        user?: InstagramUserSummary;
    };
    user?: InstagramUserSummary;
    items?: InstagramMediaItem[];
    reels_media?: InstagramReelMedia[];
}

export type FetchRequestType =
    | "getReelsMediaFromFeed"
    | "getMediaFromInfo"
    | "getUserFromInfo"
    | "getUserInfoFromWebProfile";

export type FetchDataConfig =
    | { type: "getReelsMediaFromFeed"; articleNode?: HTMLElement; id?: string | null }
    | { type: "getMediaFromInfo"; articleNode: HTMLElement }
    | { type: "getUserFromInfo"; userId: string }
    | { type: "getUserInfoFromWebProfile"; userName: string };

export type DownloadableMedia = string | InstagramMediaItem | { width?: number; height?: number; url?: string };

export const isDownloadableImageLike = (
    media: DownloadableMedia
): media is { width?: number; height?: number; url?: string } =>
    typeof media === "object" && media !== null && "url" in media;

export const isInstagramMediaItem = (media: DownloadableMedia): media is InstagramMediaItem =>
    typeof media === "object"
    && media !== null
    && ("items" in media || "carousel_media" in media || "video_versions" in media || "image_versions2" in media || "taken_at" in media);
