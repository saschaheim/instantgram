import { FetchDataConfig, FetchRequestType, InstagramMediaInfoResponse } from "./instagramTypes";

const mediaIdCache: Map<string, string> = new Map();
const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const shortcodePattern = new RegExp(`^[${shortcodeAlphabet.replace(/[-_]/g, "\\$&")}]+$`);
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
    const appIdPattern = /"X-IG-App-ID":"([\d]+)"/;
    const scripts = Array.from(document.querySelectorAll("body > script")) as HTMLScriptElement[];

    const script = scripts
        .map(s => s.textContent?.match(appIdPattern))
        .find(Boolean);
    return script ? script[1] : null;
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

    if (!mediaIdCache.has(postId)) {
        const shortcodeMediaId = shortcodeToMediaId(postId);
        if (shortcodeMediaId) {
            mediaIdCache.set(postId, shortcodeMediaId);
            return shortcodeMediaId;
        }

        const mediaIdPattern = /instagram:\/\/media\?id=(\d+)|["' ]media_id["' ]:["' ](\d+)["' ]/;
        const postUrl = `https://www.instagram.com/p/${postId}/`;
        const resp = await fetch(postUrl);
        const text = await resp.text();

        let idMatch = text.match(mediaIdPattern);
        if (!idMatch) {
            const resp = await fetch(postUrl + "?__a=1&__d=dis");
            const text = await resp.text();
            idMatch = text.match(/"pk":(\d+)/);
            if (!idMatch) {
                return null;
            }
        }

        let mediaId = null;
        for (let i = 0; i < idMatch.length; ++i) {
            if (idMatch[i]) {
                mediaId = idMatch[i];
            }
        }

        if (!mediaId) {
            return null;
        }

        mediaIdCache.set(postId, mediaId);
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
            return `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${isHighlight ? 'highlight%3A' : ''}${mediaId}`;
        },
        'getMediaFromInfo': async () => {
            const articleNode = "articleNode" in config ? config.articleNode : undefined;
            if (!articleNode) return null;
            const postId = findPostId(articleNode);
            if (!postId) return null;
            const mediaId = await findMediaId(postId);
            if (!mediaId) return null;
            return `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
        },
        'getUserFromInfo': () => {
            const userId = "userId" in config ? config.userId : null;
            return userId ? `https://i.instagram.com/api/v1/users/${userId}/info/` : null;
        },
        'getUserInfoFromWebProfile': () => {
            const userName = "userName" in config ? config.userName : null;
            return userName ? `https://i.instagram.com/api/v1/users/web_profile_info/?username=${userName}` : null;
        },
    };
    const url = await urlMap[type]?.();
    if (!url) return null;

    return secureFetch(url, appId);
};

export const secureFetch = async (url: string, appId: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);

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

/**
 * Resolves a username to its numeric user id via Instagram's web search
 * endpoint. Some accounts currently trigger a deleted-schema error
 * ("ig_business_category_subvertical") from web_profile_info even though
 * search still returns them -- use this as a fallback when that lookup
 * fails.
 */
export const resolveUserIdFromSearch = async (userName: string): Promise<string | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(userName)}`;
    const payload = await secureFetch(url, appId);
    const users = payload?.users as Array<{ user?: { username?: string; id?: string } }> | undefined;
    const wanted = userName.toLowerCase();
    const match = users?.find(entry => entry.user?.username?.toLowerCase() === wanted && entry.user?.id);
    return match?.user?.id ?? null;
};

export const getIGUsername = (url: string): string | null => {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
};
