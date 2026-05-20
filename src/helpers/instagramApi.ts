import { FetchDataConfig, FetchRequestType, InstagramMediaInfoResponse } from "./instagramTypes";

const mediaIdCache: Map<string, string> = new Map();
const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

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

    const prefixHandlers = {
        '/reel/': () => segments[2],
        '/reels/': () => segments[2],
        '/stories/': () => segments[3],
    };

    for (const prefix in prefixHandlers) {
        if (pathname.startsWith(prefix)) return prefixHandlers[prefix]();
    }

    const locationPostIdMatch = window.location.href.match(/instagram\.com\/p\/([^/?#]+)/i);
    if (locationPostIdMatch) {
        return locationPostIdMatch[1];
    }

    const postIdPattern = /^\/p\/([^/?#]+)(?:\/|\?|#|$)/;
    return Array.from(articleNode.querySelectorAll("a[href]"))
        .map(a => a.getAttribute("href")?.match(postIdPattern))
        .find(match => match)?.[1] || null;
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
            const postId = articleNode ? findPostId(articleNode) : null;
            const mediaId = id || (postId ? await findMediaId(postId) : null);
            if (!mediaId) return null;
            return `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id ? '' : 'highlight%3A'}${mediaId}`;
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

export const getIGUsername = (url: string): string | null => {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
};
