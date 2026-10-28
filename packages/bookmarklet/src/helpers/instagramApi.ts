import { storiesPathPrefix } from "./common";
import {
    FetchDataConfig,
    FetchRequestType,
    InstagramMediaInfoResponse,
    InstagramMediaItem,
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

    const locationPostIdMatch = window.location.href.match(/instagram\.com\/(?:[\w.]+\/)?p\/([^/?#]+)/i);
    if (locationPostIdMatch) {
        return normalizePostId(locationPostIdMatch[1]);
    }

    const locationReelIdMatch = window.location.href.match(/instagram\.com\/(?:[\w.]+\/)?reels?\/([^/?#]+)/i);
    if (locationReelIdMatch) {
        return normalizePostId(locationReelIdMatch[1]);
    }

    const postIdPattern = /^\/(?:[\w.]+\/)?(?:p|reels?)\/([^/?#]+)(?:[/?#]|$)/;
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

const reelsMediaUrl = (reelId: string, isHighlight = false) =>
    iApiV1Prefix+"feed/reels_media/?reel_ids="+(isHighlight ? 'highlight%3A' : '')+reelId;

const hasReelItems = (response: InstagramMediaInfoResponse | null | undefined) =>
    !!response?.reels_media?.[0]?.items?.length;

// PolarisStoriesV3ReelPageStandaloneQuery -- the query instagram.com's own
// story page preloads. Its items already have the mobile shape (image_versions2,
// video_versions), so nothing needs converting.
const storyReelDocId = "28449850404637481";

/**
 * Loads a user's story reel. The mobile reels_media endpoint now answers
 * {"reels":{},"status":"ok"} for some web sessions (captured 2026-10-17), so
 * an empty answer falls through to the web app's own GraphQL story query and
 * then to Instaloader's legacy query.
 */
const fetchStoryReel = async (reelId: string, mediaId: string | undefined, appId: string): Promise<InstagramMediaInfoResponse | null> => {
    const mobile = await secureFetch(reelsMediaUrl(reelId), appId);
    if (hasReelItems(mobile)) return mobile;

    const web = (await postGraphql(storyReelDocId, "PolarisStoriesV3ReelPageStandaloneQuery", JSON.stringify({
        media_id: mediaId ?? null,
        reel_ids_arr: [reelId],
        __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true,
    })))?.data?.xdt_api__v1__feed__reels_media;
    if (hasReelItems(web)) return web;

    // Same story query as Instaloader.get_stories; convert its web media fields
    // into the mobile-shaped media objects consumed by our viewer.
    const variables = JSON.stringify({ reel_ids: [reelId], precomposed_overlay: false });
    const graphql = await secureFetch(wwwPrefix+"graphql/query/?query_hash=303a4ae99711322310f25250d988f3b7&variables="+encodeURIComponent(variables), appId);
    const reels = graphql?.data?.reels_media as Array<{
        user?: InstagramMediaItem["user"];
        items?: Array<InstagramMediaItem & {
            owner?: InstagramMediaItem["user"];
            display_resources?: Array<{ src?: string }>;
            video_resources?: Array<{ src?: string }>;
        }>;
    }> | undefined;
    const legacy = Array.isArray(reels) ? { reels_media: reels.map(reel => ({ ...reel, items: reel.items?.map(item => ({
        ...item,
        user: item.owner,
        image_versions2: { candidates: item.display_resources?.map(resource => ({ url: resource.src })) },
        video_versions: item.video_resources?.map(resource => ({ url: resource.src })),
    })) })) } : null;
    return hasReelItems(legacy) ? legacy : null;
};

export const fetchDataFromApi = async (config: FetchDataConfig): Promise<InstagramMediaInfoResponse | null> => {
    const { type } = config;
    const appId = findAppId();
    if (!appId) {
        console.info("Instagram App ID not found.");
        return null;
    }

    const id = "id" in config ? config.id : undefined;
    const isHighlight = "isHighlight" in config ? config.isHighlight : false;

    if (type === "getReelsMediaFromFeed" && !isHighlight) {
        // A story URL already identifies the media even when owner lookup
        // fails, and that single story's owner identifies the whole reel.
        const storyId = window.location.pathname.match(/^\/stories\/(?!highlights\/)[^/]+\/(\d+)\/?$/)?.[1];
        const singleUrl = storyId ? mediaInfoUrlPrefix+storyId+"/info/" : null;
        const single = !id && singleUrl ? await secureFetch(singleUrl, appId) : null;
        const owner = single?.items?.[0]?.user;
        const reelId = id || (owner?.pk ?? owner?.id)?.toString();
        const reel = reelId ? await fetchStoryReel(reelId, storyId, appId) : null;
        return reel || single || (id && singleUrl ? await secureFetch(singleUrl, appId) : null);
    }

    const urlMap: Record<FetchRequestType, () => Promise<string | null> | string> = {
        'getReelsMediaFromFeed': async () => {
            const articleNode = "articleNode" in config ? config.articleNode : undefined;
            const postId = articleNode ? findPostId(articleNode) : null;
            const mediaId = id || (postId ? await findMediaId(postId) : null);
            if (!mediaId) return null;
            return reelsMediaUrl(mediaId, isHighlight);
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

    return await secureFetch(url, appId);
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

type UsernameOwner = PictureOwner & {
    pk?: string | number;
    id?: string | number;
    username?: string;
};

/** Read the profile data embedded in HTML, as Instaloader's from_username does.
 * Browser fetch cannot set Instaloader's Sec-Fetch navigation headers, so the
 * existing page is checked first and an anonymous HTML fetch is only a fallback.
 *
 * Two embedded shapes carry the id. A user dict with the wanted `username`
 * and a `pk` is preferred: `xig_user_by_username` on a logged-in profile
 * page, or the `reels_media[].user` preloaded on a directly opened story
 * page. Failing that, the route definition names the user in
 * `route.params.username` and its id in `page_logging.params.profile_id`
 * (also as the `profilePage_<id>` / `StoriesPage_<id>` page_id). Since
 * October 2026 the anonymous profile page embeds no user dict at all, so
 * that route id is all the HTML fallback has left.
 */
export const findEmbeddedProfile = (page: Document, userName: string): UsernameOwner | null => {
    const wanted = userName.toLowerCase();
    const isWanted = (name: unknown) => typeof name === "string" && name.toLowerCase() === wanted;
    const asRecord = (value: unknown): Record<string, unknown> | null =>
        value && typeof value === "object" ? value as Record<string, unknown> : null;

    const findRouteId = (value: unknown): string | null => {
        const record = asRecord(value);
        if (!record) return null;
        if (/^\d+$/.test(String(record.profile_id ?? ""))) return String(record.profile_id);
        const pageId = String(record.page_id ?? "").match(/^(?:profilePage|StoriesPage)_(\d+)$/)?.[1];
        if (pageId) return pageId;
        for (const child of Object.values(record)) {
            const id = findRouteId(child);
            if (id) return id;
        }
        return null;
    };

    const routeIds: string[] = [];
    const findUser = (value: unknown): UsernameOwner | null => {
        const record = asRecord(value);
        if (!record) return null;
        if (isWanted(record.username) && record.pk != null) return record as UsernameOwner;
        if (isWanted(asRecord(record.params)?.username)) {
            const id = findRouteId(record);
            if (id) routeIds.push(id);
        }
        for (const child of Object.values(record)) {
            const match = findUser(child);
            if (match) return match;
        }
        return null;
    };

    for (const script of page.querySelectorAll('script[type="application/json"]')) {
        try {
            const user = findUser(JSON.parse(script.textContent || "null"));
            if (user) return user;
        } catch { /* Malformed or unrelated scripts are not profile data. */ }
    }
    return routeIds.length ? { pk: routeIds[0], username: userName } : null;
};

const fetchPageOwner = async (userName: string): Promise<UsernameOwner | null> => {
    try {
        const response = await fetch(wwwPrefix+encodeURIComponent(userName)+"/", {
            headers: { Accept: "text/html" },
            credentials: "omit",
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return null;
        const page = new DOMParser().parseFromString(await response.text(), "text/html");
        return findEmbeddedProfile(page, userName);
    } catch { return null; }
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
 * Resolves a username to its numeric user id and owner object: the current
 * page's embedded data first, then the anonymous profile HTML, and the
 * username feed last. The feed used to go first, but Instagram now answers
 * it with {"spam":true,"status":"fail"} for some sessions, so it is only hit
 * once the request-free and anonymous sources have both failed. None of the
 * steps needs web_profile_info, the brittle, per-account-gated endpoint that
 * returns 400/401 for otherwise-valid public accounts (see
 * https://github.com/jackwener/opencli/issues/2147 and instaloader#2482).
 * The owner is kept because some business/creator accounts get a
 * stripped-down /users/{id}/info/ response with no profile_pic_url* field at
 * all, in which case it is the only remaining picture source.
 */
export const resolveProfile = async (userName: string) => {
    const embedded = findEmbeddedProfile(document, userName);
    if (embedded) return { userId: String(embedded.pk), owner: embedded };
    const page = await fetchPageOwner(userName);
    if (page?.pk != null) return { userId: String(page.pk), owner: page };
    const feed = await fetchFeedOwner(userName);
    const feedId = feed?.pk ?? feed?.id;
    return { userId: feedId != null ? String(feedId) : null, owner: feed ?? page };
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
export const fetchGraphqlOwner = async (userId: string): Promise<PictureOwner | null> =>
    (await postGraphql(profilePageDocId, "PolarisProfilePageContentQuery", profilePageVariables(userId)))?.data?.user ?? null;

/**
 * Posts a persisted query to instagram.com's own GraphQL endpoint, as the web
 * app does. Needs the page's `lsd`, `fb_dtsg` and csrftoken, so it returns
 * null without sending anything when any of them is missing.
 */
const postGraphql = async (docId: string, friendlyName: string, variables: string) => {
    const appId = findAppId();
    const lsd = document.querySelector<HTMLInputElement>('input[name="lsd"]')?.value
        || findInScripts(/"LSD",\[\],\{"token":"([^"]+)"/);
    const dtsg = findInScripts(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/);
    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
    if (!appId || !lsd || !dtsg || !csrfToken) {
        return null;
    }

    const body = new URLSearchParams({
        doc_id: docId,
        variables,
        lsd,
        fb_dtsg: dtsg,
        server_timestamps: "true",
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: friendlyName,
    });

    return await secureFetch(wwwPrefix+"api/graphql", appId, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
            'X-FB-Friendly-Name': friendlyName,
            'X-FB-LSD': lsd,
        },
        body: body.toString(),
    });
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
