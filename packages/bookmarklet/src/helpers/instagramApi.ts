import { storiesPathPrefix } from "./common";
import {
    FetchDataConfig,
    FetchRequestType,
    InstagramMediaInfoResponse,
    InstagramProfilePicture
} from "./instagramTypes";

const iApiV1Prefix = "https://i.instagram.com/api/v1/";
const wwwPrefix = "https://www.instagram.com/";
export const mediaInfoUrlPrefix = iApiV1Prefix+"media/";

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

const findInScripts = (pattern: RegExp): string | null =>
    Array.from(document.scripts)
        .map(s => s.textContent?.match(pattern))
        .find(Boolean)?.[1] ?? null;

export const findAppId = (): string | null =>
    findInScripts(/["']?X-IG-App-ID["']?\s*:\s*["']?(\d+)/i) || "936619743392459";

export const findPostId = (articleNode: HTMLElement) => {
    const pathname = window.location.pathname;
    const segments = pathname.split('/');
    const normalizedPathId = pathname.startsWith("/reel/") || pathname.startsWith("/reels/")
        ? normalizePostId(segments[2])
        : pathname.startsWith(storiesPathPrefix)
            ? segments[3]
            : null;
    if (normalizedPathId) {
        return normalizedPathId;
    }

    const locationPostIdMatch = window.location.href.match(/instagram\.com\/p\/([^/?#]+)/i);
    if (locationPostIdMatch) {
        return normalizePostId(locationPostIdMatch[1]);
    }

    const locationReelIdMatch = window.location.href.match(/instagram\.com\/reels?\/([^/?#]+)/i);
    if (locationReelIdMatch) {
        return normalizePostId(locationReelIdMatch[1]);
    }

    const postIdPattern = /^\/(?:p|reels?)\/([^/?#]+)(?:[/?#]|$)/;
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
            return iApiV1Prefix+"feed/reels_media/?reel_ids="+(isHighlight ? 'highlight%3A' : '')+mediaId;
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
            return userId ? iApiV1Prefix+"users/"+userId+"/info/" : null;
        },
    };
    const url = await urlMap[type]?.();
    if (!url) return null;

    return secureFetch(url, appId);
};

export const secureFetch = async (url: string, appId: string, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            ...init,
            headers: { Accept: '*/*', 'X-IG-App-ID': appId, ...init?.headers },
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
 * The profile-picture fields every owner-shaped response carries, in whatever
 * subset that endpoint happens to return. resolveProfilePictureInfo reads all
 * of them and keeps the largest.
 */
type PictureOwner = {
    profile_pic_url?: string;
    profile_pic_url_hd?: string;
    hd_profile_pic_url_info?: InstagramProfilePicture;
    hd_profile_pic_versions?: InstagramProfilePicture[];
};

type SearchOwner = PictureOwner & {
    id?: string;
    username?: string;
};

/**
 * Resolves a username to its numeric user id via Instagram's web search
 * endpoint, and returns the matched search-result user with it. Some accounts
 * trigger a deleted-schema error ("ig_business_category_subvertical") from
 * web_profile_info even though search still returns them. For private
 * accounts, /users/{id}/info/ comes back completely empty
 * ({"user":{},"status":"ok"}, confirmed via a real captured response) even
 * once the id resolves fine, and the feed lookup can't help either since a
 * private account's feed is empty for a non-follower -- search still returns
 * the (150px) profile_pic_url, profile pictures being public even for private
 * accounts, so it doubles as a last-resort picture source.
 */
const fetchSearchOwner = async (userName: string): Promise<SearchOwner | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = wwwPrefix+"web/search/topsearch/?query="+encodeURIComponent(userName);
    const payload = await secureFetch(url, appId);
    const users = payload?.users as Array<{ user?: SearchOwner }> | undefined;
    const wanted = userName.toLowerCase();
    const match = users?.find(entry => entry.user?.username?.toLowerCase() === wanted && entry.user?.id);
    return match?.user ?? null;
};

type FeedOwner = PictureOwner & {
    pk?: string | number;
    id?: string | number;
};

const fetchFeedOwner = async (userName: string): Promise<FeedOwner | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = wwwPrefix+"api/v1/feed/user/"+encodeURIComponent(userName)+"/username/?count=1";
    const payload = await secureFetch(url, appId);
    const items = payload?.items as Array<{ user?: FeedOwner }> | undefined;
    return items?.[0]?.user ?? null;
};

/**
 * Resolves a username to its numeric user id and owner object, feed first and
 * search as a fallback. Neither step needs web_profile_info, the brittle,
 * per-account-gated endpoint that returns 400/401 for otherwise-valid public
 * accounts (see https://github.com/jackwener/opencli/issues/2147 and
 * instaloader#2482). The owner is kept because some business/creator accounts
 * get a stripped-down /users/{id}/info/ response with no profile_pic_url*
 * field at all, in which case it is the only remaining picture source.
 */
export const resolveProfile = async (userName: string) => {
    const feed = await fetchFeedOwner(userName);
    const feedId = feed?.pk ?? feed?.id;
    if (feedId != null) return { userId: String(feedId), owner: feed };
    const search = await fetchSearchOwner(userName);
    return { userId: search?.id ?? null, owner: search };
};

// PolarisProfilePageContentQuery -- the query instagram.com's own profile page
// runs. It is the only source that returns the profile picture with no `stp`
// resize at all, i.e. the full-size 1080 original, and the only one that does
// so for a private account (feed is empty for a non-follower, search and
// /users/{id}/info/ cap at 150, web_profile_info at 320). Verified live: A
// minimal body and a body with only `lsd` both come back with a null user;
// `fb_dtsg` is what makes the query resolve.
const profilePageDocId = "37354402187538639";
const profilePageVariables = (userId: string) => JSON.stringify({
    id: userId,
    enable_integrity_filters: true,
    __relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider: true,
    __relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider: false,
    __relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider: false,
    __relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider: true,
    __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: false,
    __relay_internal__pv__PolarisLongformEnabledrelayprovider: false,
});

/**
 * Fetches the profile picture through the page's own GraphQL query. Needs the
 * page's `lsd` and `fb_dtsg` tokens, so it only works while running on
 * instagram.com -- and it silently returns null if either token or the doc_id
 * stops working, leaving the smaller sources as fallbacks.
 */
export const fetchGraphqlOwner = async (userId: string): Promise<PictureOwner | null> => {
    const appId = findAppId();
    const lsd = document.querySelector<HTMLInputElement>('input[name="lsd"]')?.value
        || findInScripts(/"LSD",\[\],\{"token":"([^"]+)"/);
    const dtsg = findInScripts(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/);
    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
    if (!appId || !lsd || !dtsg || !csrfToken) {
        return null;
    }

    const body = new URLSearchParams({
        doc_id: profilePageDocId,
        variables: profilePageVariables(userId),
        lsd,
        fb_dtsg: dtsg,
        server_timestamps: "true",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "PolarisProfilePageContentQuery",
    });

    const payload = await secureFetch(wwwPrefix+"api/graphql", appId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-FB-Friendly-Name': "PolarisProfilePageContentQuery",
        },
        body: body.toString(),
    });

    return payload?.data?.user ?? null;
};

/**
 * web_profile_info stays switched off for id resolution -- it's the brittle,
 * per-account-gated endpoint from issue #45. It is still the only source that
 * hands back a 320px profile picture for a private account, though: the feed
 * is empty for a non-follower and both search and /users/{id}/info/ cap out
 * at the 150px thumbnail. Fetched purely as an extra picture candidate, so a
 * failure here costs nothing.
 */
export const fetchWebProfileOwner = async (userName: string): Promise<PictureOwner | null> => {
    const appId = findAppId();
    if (!appId) {
        return null;
    }

    const url = wwwPrefix+"api/v1/users/web_profile_info/?username="+encodeURIComponent(userName);
    const payload = await secureFetch(url, appId);
    return payload?.data?.user ?? null;
};

export const getIGUsername = (url: string): string | null => {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/;
    const match = url.match(regex);
    return match ? match[2] : null;
};
