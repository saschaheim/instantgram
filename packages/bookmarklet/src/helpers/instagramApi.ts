import { FetchDataConfig, FetchRequestType, InstagramMediaInfoResponse } from "./instagramTypes";

export const mediaInfoUrlPrefix = "https://i.instagram.com/api/v1/media/";

const mediaIdCache: Map<string, string> = new Map();
const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const shortcodePattern = new RegExp("^["+shortcodeAlphabet.replace(/[-_]/g, "\\$&")+"]+$");
const canonicalShortcodeLength = 11;

const normalizePostId = (postId: string | null): string | null => {
    if (!postId) {
        return null;
    }

    const trimmed = postId.trim();
    if (!shortcodePattern.test(trimmed)) {
        return trimmed;
    }

    return trimmed.length > canonicalShortcodeLength
        ? trimmed.slice(0, canonicalShortcodeLength)
        : trimmed;
};

export const findAppId = (): string | null => {
    const appIdPattern = /["']?X-IG-App-ID["']?\s*:\s*["']?(\d+)/i;
    const scripts = Array.from(document.scripts);

    const script = scripts
        .map(s => s.textContent?.match(appIdPattern))
        .find(Boolean);
    return script?.[1] || "936619743392459";
};

export const findPostId = (articleNode: HTMLElement) => {
    const pathname = window.location.pathname;
    const segments = pathname.split('/');
    const normalizedPathId = pathname.startsWith("/reel/") || pathname.startsWith("/reels/")
        ? normalizePostId(segments[2])
        : pathname.startsWith("/stories/")
            ? segments[3]
            : null;
    if (normalizedPathId) {
        return normalizedPathId;
    }

    const locationPostIdMatch = window.location.href.match(/instagram\.com\/p\/([^/?#]+)/i);
    if (locationPostIdMatch) {
        return normalizePostId(locationPostIdMatch[1]);
    }

    const locationReelIdMatch = window.location.href.match(/instagram\.com\/(?:reel|reels)\/([^/?#]+)/i);
    if (locationReelIdMatch) {
        return normalizePostId(locationReelIdMatch[1]);
    }

    const postIdPattern = /^\/(?:p|reel|reels)\/([^/?#]+)(?:\/|\?|#|$)/;
    return normalizePostId(Array.from(articleNode.querySelectorAll("a[href]"))
        .map(a => a.getAttribute("href")?.match(postIdPattern))
        .find(match => match)?.[1] || null);
};

export const shortcodeToMediaId = (shortcode: string): string | null => {
    if (!shortcode) {
        return null;
    }

    let mediaId = 0n;
    for (const char of shortcode) {
        const index = shortcodeAlphabet.indexOf(char);
        if (index === -1) {
            return null;
        }
        mediaId = (mediaId * 64n) + BigInt(index);
    }

    return mediaId.toString();
};

export async function findMediaId(postId: string) {
    postId = normalizePostId(postId) || postId;
    const match = window.location.href.match(/www.instagram.com\/stories\/[^/]+\/(\d+)/);
    if (match) return match[1];
    if (/^\d+$/.test(postId)) return postId;

    if (!mediaIdCache.has(postId)) {
        const shortcodeMediaId = shortcodeToMediaId(postId);
        if (!shortcodeMediaId) {
            return null;
        }

        mediaIdCache.set(postId, shortcodeMediaId);
    }

    return mediaIdCache.get(postId);
}

export const fetchDataFromApi = async (config: FetchDataConfig): Promise<InstagramMediaInfoResponse | null> => {
    const { type } = config;
    const appId = findAppId();
    if (!appId) {
        console.info("Instagram App ID not found.");
        return null;
    }

    const urlMap: Record<FetchRequestType, () => Promise<string | null> | string> = {
        'getReelsMediaFromFeed': async () => {
            const articleNode = "articleNode" in config ? config.articleNode : undefined;
            const id = "id" in config ? config.id : undefined;
            const isHighlight = "isHighlight" in config ? config.isHighlight : false;

            // A regular (non-highlight) story's reel_ids must be the owner's
            // user id. If that id couldn't be resolved (e.g. web_profile_info
            // failed), there is no valid query to build here -- bail out
            // instead of guessing, which previously misread "no id" as "this
            // must be a highlight" and sent a nonsensical highlight-prefixed
            // request for a media id (see issue #45).
            if (!isHighlight && !id) {
                return null;
            }

            const postId = articleNode ? findPostId(articleNode) : null;
            const mediaId = id || (postId ? await findMediaId(postId) : null);
            if (!mediaId) return null;
            return "https://i.instagram.com/api/v1/feed/reels_media/?reel_ids="+(isHighlight ? 'highlight%3A' : '')+mediaId;
        },
        'getMediaFromInfo': async () => {
            const articleNode = "articleNode" in config ? config.articleNode : undefined;
            if (!articleNode) return null;
            const postId = findPostId(articleNode);
            if (!postId) return null;
            const mediaId = await findMediaId(postId);
            if (!mediaId) return null;
            return mediaInfoUrlPrefix+mediaId+"/info/";
        },
        'getUserFromInfo': () => {
            const userId = "userId" in config ? config.userId : null;
            return userId ? "https://i.instagram.com/api/v1/users/"+userId+"/info/" : null;
        },
    };
    const url = await urlMap[type]?.();
    if (!url) return null;

    return secureFetch(url, appId);
};

export const secureFetch = async (url: string, appId: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: '*/*', 'X-IG-App-ID': appId },
            credentials: 'include',
            mode: 'cors',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.info(`Fetch API failed with status code: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.info(`Error fetching data: ${message}`);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
};

type SearchOwner = {
    id?: string;
    username?: string;
    profile_pic_url?: string;
    profile_pic_url_hd?: string;
    hd_profile_pic_url_info?: { url?: string; width?: number; height?: number };
};

const fetchSearchOwner = async (userName: string): Promise<SearchOwner | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = "https://www.instagram.com/web/search/topsearch/?query="+encodeURIComponent(userName);
    const payload = await secureFetch(url, appId);
    const users = payload?.users as Array<{ user?: SearchOwner }> | undefined;
    const wanted = userName.toLowerCase();
    const match = users?.find(entry => entry.user?.username?.toLowerCase() === wanted && entry.user?.id);
    return match?.user ?? null;
};

/**
 * Resolves a username to its numeric user id via Instagram's web search
 * endpoint. Some accounts currently trigger a deleted-schema error
 * ("ig_business_category_subvertical") from web_profile_info even though
 * search still returns them -- use this as a fallback when that lookup
 * fails.
 */
/**
 * Same lookup as resolveUserIdFromSearch, but also returns the matched
 * search-result user object. For private accounts, /users/{id}/info/ comes
 * back completely empty ({"user":{},"status":"ok"}, confirmed via a real
 * captured response) even once the id resolves fine -- and the feed
 * fallback also can't help here, since a private account's feed is empty
 * for a non-follower. Search still returns the profile_pic_url (profile
 * pictures are public even for private accounts), so it's kept as a
 * last-resort profile-picture source too.
 */
type FeedOwner = {
    pk?: string | number;
    id?: string | number;
    profile_pic_url?: string;
    profile_pic_url_hd?: string;
    hd_profile_pic_url_info?: { url?: string; width?: number; height?: number };
};

const fetchFeedOwner = async (userName: string): Promise<FeedOwner | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = "https://www.instagram.com/api/v1/feed/user/"+encodeURIComponent(userName)+"/username/?count=1";
    const payload = await secureFetch(url, appId);
    const items = payload?.items as Array<{ user?: FeedOwner }> | undefined;
    return items?.[0]?.user ?? null;
};

/**
 * Resolves a username to its numeric user id via a direct username-scoped
 * feed lookup, with no separate id-resolution step. web_profile_info is a
 * known-brittle, per-account-gated endpoint (see
 * https://github.com/jackwener/opencli/issues/2147 and instaloader#2482,
 * both reporting 400/401 for otherwise-valid public accounts); this endpoint
 * isn't gated the same way and doesn't need web_profile_info at all. Used
 * as a fallback alongside resolveUserIdFromSearch when web_profile_info
 * fails.
 */
/**
 * Same lookup as resolveUserIdFromFeed, but also returns the embedded owner
 * object. Some business/creator accounts get a stripped-down response from
 * the web-style /users/{id}/info/ endpoint (no profile_pic_url* fields at
 * all, confirmed via a real captured response for a creator account), even
 * once the id is resolved -- the feed owner's plain profile_pic_url is used
 * as a last-resort fallback source in that case.
 */
export const resolveProfile = async (userName: string) => {
    const feed = await fetchFeedOwner(userName);
    const feedId = feed?.pk ?? feed?.id;
    if (feedId != null) return { userId: String(feedId), owner: feed };
    const search = await fetchSearchOwner(userName);
    return { userId: search?.id ?? null, owner: search };
};

export const getIGUsername = (url: string): string | null => {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
};
