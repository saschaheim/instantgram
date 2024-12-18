import { Program } from "../App"; // Importing the Program type from the app module to handle settings and configuration.
import { MediaScanResult } from "../model/MediaScanResult"; // Importing the MediaScanResult type, used to structure media scan results.
import { MediaType } from "../model/MediaType"; // Importing the MediaType enum, used to classify media (e.g., image, video, etc.)
import localization from "../localization"; // Importing localization data to handle multi-language support.
import localize from "./localize"; // Importing the localize function to fetch localized strings for user display.

const mediaIdCache: Map<string, string> = new Map(); // Cache to store previously fetched media IDs to avoid redundant API calls.

/**
 * findAppId - Extracts Instagram's App ID from the HTML page scripts.
 * It looks for a script containing "X-IG-App-ID" and retrieves the app ID.
 * @returns The Instagram App ID or null if not found.
 */
export const findAppId = (): string | null => {
    const appIdPattern = /"X-IG-App-ID":"([\d]+)"/; // Pattern to match the Instagram app ID
    const scripts = Array.from(document.querySelectorAll("body > script")) as HTMLScriptElement[]; // Get all script tags

    const script = scripts
        .map(s => s.textContent?.match(appIdPattern)) // Match the pattern in script content
        .find(Boolean); // Find the first matching script
    return script ? script[1] : null; // Return the app ID or null if not found
};

/**
 * findPostId - Extracts the post ID from the article node based on the current URL.
 * It identifies the post ID for reels, stories, or regular posts based on the URL structure.
 * @param articleNode - The HTML element containing the post information.
 * @returns The post ID or null if not found.
 */
export const findPostId = (articleNode: HTMLElement) => {
    const pathname = window.location.pathname;
    const segments = pathname.split('/'); // Split the URL path into segments.

    const prefixHandlers = {
        '/reel/': () => segments[2], // For reels, extract the post ID from the second segment.
        '/reels/': () => segments[2], // Same for other reel-related URLs.
        '/stories/': () => segments[3], // For stories, extract the post ID from the third segment.
    };

    for (const prefix in prefixHandlers) {
        if (pathname.startsWith(prefix)) return prefixHandlers[prefix](); // Return the post ID based on the prefix.
    }

    const postIdPattern = /^\/p\/([^/]+)\//; // Regex pattern to match post ID in /p/ URLs.
    return Array.from(articleNode.querySelectorAll("a[href]"))
        .map(a => a.getAttribute("href")?.match(postIdPattern)) // Match the post ID pattern in the href attributes.
        .find(match => match)?.[1] || null; // Return the post ID or null if not found.
};

/**
 * findMediaId - Retrieves the media ID for a given post ID.
 * It caches the result to prevent multiple fetches of the same media ID.
 * @param postId - The post ID to retrieve the media ID for.
 * @returns The media ID or null if not found.
 */
export async function findMediaId(postId: string) {
    const match = window.location.href.match(/www.instagram.com\/stories\/[^/]+\/(\d+)/);
    if (match) return match[1]; // Directly extract the media ID for stories from the URL.

    if (!mediaIdCache.has(postId)) {
        const mediaIdPattern = /instagram:\/\/media\?id=(\d+)|["' ]media_id["' ]:["' ](\d+)["' ]/; // Regex for matching media ID.
        const postUrl = `https://www.instagram.com/p/${postId}/`; // Construct the URL for the post.
        const resp = await fetch(postUrl); // Fetch the post content.
        const text = await resp.text(); // Extract text content from the response.

        let idMatch = text.match(mediaIdPattern); // Try to match the media ID pattern in the page content.
        if (!idMatch) {
            // If no match, attempt another approach.
            const resp = await fetch(postUrl + "?__a=1&__d=dis");
            const text = await resp.text();
            idMatch = text.match(/"pk":(\d+)/);
            if (!idMatch) {
                return null; // Return null if still no match.
            }
        }

        let mediaId = null;
        for (let i = 0; i < idMatch.length; ++i) {
            if (idMatch[i]) {
                mediaId = idMatch[i]; // Use the first valid match.
            }
        }

        if (!mediaId) {
            return null; // Return null if no valid media ID is found.
        }

        mediaIdCache.set(postId, mediaId); // Cache the media ID for future use.
    }

    return mediaIdCache.get(postId); // Return the cached media ID.
}

/**
 * fetchDataFromApi - Fetches data from Instagram's API based on the specified configuration.
 * It handles different types of requests, such as getting media information or user data.
 * @param config - The configuration object containing the request type and parameters.
 * @returns The response data from the API or null if an error occurs.
 */
export const fetchDataFromApi = async (config) => {
    const { type, articleNode, id, userName, userId } = config;
    const appId = findAppId(); // Get the Instagram App ID
    if (!appId) {
        console.log('AppID not found');
        return null;
    }

    const urlMap = {
        // URL for fetching media from reels feed
        'getReelsMediaFromFeed': async () => {
            const mediaId = id || await findMediaId(findPostId(articleNode));
            if (!mediaId) return null;
            return `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id ? '' : 'highlight%3A'}${mediaId}`;
        },
        // URL for fetching media info by media ID
        'getMediaFromInfo': async () => {
            const mediaId = await findMediaId(findPostId(articleNode));
            if (!mediaId) return null;
            return `https://i.instagram.com/api/v1/media/${mediaId}/info/`;
        },
        // URL for fetching user info by user ID
        'getUserFromInfo': () => `https://i.instagram.com/api/v1/users/${userId}/info/`,
        // URL for fetching user info from the web profile
        'getUserInfoFromWebProfile': () => `https://i.instagram.com/api/v1/users/web_profile_info/?username=${userName}`,
    };
    const url = await urlMap[type]?.(); // Retrieve the appropriate URL based on the type
    if (!url) return null;

    return secureFetch(url, appId); // Perform the fetch request using the app ID for authentication.
};

/**
 * generateModalBody - Generates the body of the modal that will be displayed to the user.
 * It processes the media information, user details, and formats the modal content.
 * @param el - The HTML element containing the media.
 * @param program - The program configuration object containing user settings.
 * @returns The media scan result with modal body content and media details.
 */
export const generateModalBody = async (el: HTMLElement, program: Program) => {
    const isPathMatch = (path: string) => window.location.pathname.startsWith(path); // Helper function to check path match
    let userName = getIGUsername(window.location.href); // Extract Instagram username from the URL
    const postId = findPostId(el); // Extract post ID from the article node
    const userId = isPathMatch("/stories/")
        ? (await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName }))?.data?.user?.id ?? null
        : null;

    let modalBody = "";
    const mediaInfo = await getMediaInfo(el, postId, userId); // Get media information

    // Determine the username to display in the modal based on the media information
    if (userName === postId && (isPathMatch("/p/") || isPathMatch("/reels/"))) {
        userName = mediaInfo.items?.[0]?.user?.username;
    } else {
        const userFromReels = mediaInfo.reels_media?.[0]?.user?.username;
        const userFromItems = mediaInfo.items?.[0]?.user?.username;
        userName = userFromReels || userFromItems || userName;
    }

    const userLink = resolveUserLink('https://www.instagram.com', window.location.pathname, userName); // Resolve the user profile link

    // Handle advertisement media differently based on program settings
    if (findAD(el, isPathMatch("/stories/"))) {
        if (program.settings.showAds) {
            // Process the advertisement media and prepare the modal body with media download link.
            const targetNode = el.querySelector("video[playsinline]") || el.querySelector('img[draggable]');
            if (!targetNode) return { found: false };

            const mediaUrl = findMediaUrl(el, 'post');
            const mediaType = MediaType.Video; // Determine the media type (Video in this case)
            const { formattedFilename, url } = getFormattedFilenameAndUrl(mediaUrl, userName, program.settings.formattedFilenameInput, 0);
            const mediaElement = getMediaElement(mediaType, url, program.settings.storiesMuted);
            const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`;
            const downloadUrl = program.settings.openInNewTab ? url : encodedUrl;
            modalBody += `
                <div class="slide">
                    ${mediaElement}
                    <a href="${downloadUrl}" class="${program.NAME}-modal-db">${localize("download")}</a>
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
            return { found: false }; // Do not display anything if ads are disabled
        }
    }

    // Process non-ad media and prepare modal content
    /* eslint-disable no-unused-vars */
    processMediaInfo(mediaInfo, (media: any, index: number, _count: any) => {
        modalBody = addMediaToBody(modalBody, media, index, userName, program);
    });
    /* eslint-enable no-unused-vars */

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

/**
 * generateModalBodyHelper - Generates the body content of the modal based on the media information.
 * Handles both single and multiple story media based on user settings and the media info.
 * @param el - The HTML element containing the media.
 * @param mediaInfo - The media information for the current post or story.
 * @param userName - The username of the Instagram account.
 * @param userLink - The link to the user's profile.
 * @param program - The program configuration object that includes user settings.
 * @returns The media scan result containing the modal body, media type, and other relevant information.
 */
export async function generateModalBodyHelper(el: HTMLElement, mediaInfo, userName: string, userLink: string, program: Program): Promise<MediaScanResult | null> {
    let modalBody = ""; // Initialize the modal body content.
    let itemCount = 0; // Initialize item count (used for handling single item cases).

    // If the 'noMultiStories' setting is enabled and there are multiple story items, handle accordingly.
    if (program.settings.noMultiStories && mediaInfo.reels_media?.[0]?.items.length > 0) {
        const itemIndex = resolveCurrentStoryIndex(el);
        modalBody = addMediaToBody(modalBody, mediaInfo.reels_media[0].items[itemIndex], itemIndex, userName, program);
        itemCount = 1; // Only process one item as per the settings.
    } else {
        // Process all media items in the provided media info.
        /* eslint-disable no-unused-vars */
        processMediaInfo(mediaInfo, (media: any, index: number, _count: any) => {
            modalBody = addMediaToBody(modalBody, media, index, userName, program);
        });
        /* eslint-enable no-unused-vars */
    }

    // Wrap the modal body in a slider container.
    const sliderHtml = wrapInSliderContainer(modalBody);

    // Determine the selected slider index based on the current settings.
    const selectedSliderIndex = itemCount > 0 ? resolveCurrentStoryIndex(el) : 0;

    // Return the structured media scan result.
    return {
        found: true,
        mediaType: resolveOverallMediaType(),
        mediaInfo,
        modalBody: sliderHtml,
        selectedSliderIndex,
        userName,
        userLink: userLink,
    };
}

/**
 * addMediaToBody - Adds a media item to the modal body with download options.
 * It handles the media URL, filename formatting, and generates the media element (image/video).
 * @param modalBody - The existing modal body content.
 * @param media - The media item to add to the body.
 * @param index - The index of the media item (used for naming files).
 * @param userName - The username of the Instagram account.
 * @param program - The program configuration object containing settings.
 * @returns The updated modal body content with the new media item.
 */
export const addMediaToBody = (modalBody: string, media: any, index: number, userName: string, program: Program): string => {
    // Get the formatted filename and URL for the media.
    const { formattedFilename, url } = getFormattedFilenameAndUrl(media, userName, program.settings.formattedFilenameInput, index);

    // Generate the appropriate media element (image or video) based on media type.
    const mediaElement = getMediaElement(resolveElementMediaType(media), url, program.settings.storiesMuted);

    // Encode the URL and filename for the download link.
    const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`;
    const downloadUrl = program.settings.openInNewTab ? url : encodedUrl;

    // Add the media and download link to the modal body.
    return modalBody + `
        <div class="slide">
            ${mediaElement}
            <a href="${downloadUrl}" style="width:inherit;font-size:20px;font-weight:600;margin-top:-4px;" 
               ${program.settings.openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} 
               class="${program.NAME}-modal-db">${localize("download")}
            </a>
        </div>`;
};

/**
 * getBrowserInfo - Detects the browser name and version from the user agent string.
 * This is useful for debugging or tailoring the app experience based on browser capabilities.
 * @returns An object containing the browser name and version.
 */
export const getBrowserInfo = () => {
    const ua = navigator.userAgent; // Get the user agent string.
    const match = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    let temp;

    // Handle Internet Explorer (Trident engine).
    if (/trident/i.test(match[1])) {
        temp = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return { name: 'IE', version: temp[1] || '' };
    }
    // Handle Chrome or Opera browsers.
    if (match[1] === 'Chrome') {
        temp = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (temp) return { name: temp[1].replace('OPR', 'Opera'), version: temp[2] };
    }
    // Handle other browsers (Firefox, Safari, etc.).
    if (match.length > 1) {
        const versionMatch = ua.match(/version\/(\d+)/i);
        if (versionMatch) match[2] = versionMatch[1];
        return { name: match[1], version: match[2] };
    }
    return { name: navigator.appName, version: navigator.appVersion };
};

/**
 * getElementInViewPercentage - Calculates the percentage of an element that is visible in the viewport.
 * This can be useful for lazy-loading content or triggering actions when an element becomes visible.
 * @param el - The element to check visibility for.
 * @returns The percentage of the element that is visible in the viewport.
 */
export const getElementInViewPercentage = (el: HTMLElement): number => {
    if (!el?.getBoundingClientRect) return 0; // If the element doesn't have getBoundingClientRect, return 0.

    // Get the element's bounding box and the viewport's position.
    const { top, bottom } = el.getBoundingClientRect();
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.innerHeight;
    const elementTop = top + window.scrollY;
    const elementBottom = bottom + window.scrollY;

    // Check if the element is out of view (above or below the viewport).
    if (viewportTop > elementBottom || viewportBottom < elementTop) return 0;

    // Calculate the visible height of the element and return the percentage.
    const visibleHeight = Math.min(viewportBottom, elementBottom) - Math.max(viewportTop, elementTop);
    const elementHeight = bottom - top;

    return Math.round((visibleHeight / elementHeight) * 100); // Return the percentage of the element in view.
};

/**
 * getFormattedFilenameAndUrl - Formats the filename and URL for downloading media.
 * This function also replaces placeholders in the filename template based on the media's metadata.
 * @param media - The media object (image or video).
 * @param userName - The username of the Instagram account.
 * @param template - The template string for the filename (with placeholders).
 * @param index - The index of the media item (used to differentiate multiple items).
 * @returns The formatted filename and URL for the media.
 */
export const getFormattedFilenameAndUrl = (media, userName: string, template: string, index: number) => {
    let placeholders = {};

    // Handle object media (images/videos).
    if (media && typeof media === "object" && media.height && media.width && media.url) {
        return { formattedFilename: `${userName}.jpg`, url: media.url };
    }

    // Handle string-based media (URLs).
    if (typeof media === "string") {
        const date = new Date();
        placeholders = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName,
        };
        const filename = userFilenameFormatter(template, placeholders);
        return { formattedFilename: `${filename}_${index + 1}.txt`, url: media };
    } else if (media && typeof media === "object") {
        // Handle media objects with timestamp and URL.
        const date = new Date(media.taken_at * 1000);
        placeholders = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName,
        };
        const filename = userFilenameFormatter(template, placeholders);
        const { extension, url } = getImgOrVideoUrl(media); // Determine if it's an image or video.
        return { formattedFilename: `${filename}_${index + 1}.${extension}`, url: url };
    } else {
        throw new Error("Unsupported media type"); // Throw an error if the media type is unsupported.
    }
};

/**
 * getIGUsername - Extracts the Instagram username from the URL.
 * This function looks for a URL pattern containing `/stories/`, `/reels/`, or `/p/` to capture the username.
 * @param url - The URL from which to extract the Instagram username.
 * @returns The Instagram username if the URL matches the pattern, otherwise null.
 */
export const getIGUsername = (url: string): string => {
    // Regex pattern to match Instagram URLs and capture the username
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/;
    const match = url.match(regex);
    // Return the captured username or null if no match is found
    return match ? match[2] : null;
};

/**
 * getImgOrVideoUrl - Extracts the appropriate URL for either an image or a video from the media item.
 * It checks the properties of the provided media object to identify whether it's an image or video and retrieves the corresponding URL.
 * @param item - The media item, which could contain video or image information.
 * @returns An object containing the media URL and its extension type (either 'mp4' for video or 'jpg' for image), or null if no valid URL is found.
 */
export const getImgOrVideoUrl = (item: Record<string, any>) => {
    // Check if the item has an 'items' array (e.g., for carousel media).
    if (item.items) {
        // Check for video versions in the item
        if ("video_versions" in item && item.items[0]?.video_versions?.[0]?.url) {
            return { extension: "mp4", url: item.items[0].video_versions[0].url }; // Return video URL with 'mp4' extension
        } else if (item.items[0]?.image_versions2?.candidates?.[0]?.url) {
            return { extension: "jpg", url: item.items[0].image_versions2.candidates[0].url }; // Return image URL with 'jpg' extension
        } else {
            console.error('Error: No valid video or image URL found in item.items[0]');
            return null; // Return null if no valid URL is found
        }
    }

    // Handle the case where 'items' is not present (single media item).
    if ("video_versions" in item && item.video_versions?.[0]?.url) {
        return { extension: "mp4", url: item.video_versions[0].url }; // Return video URL with 'mp4' extension
    } else if (item.image_versions2?.candidates?.[0]?.url) {
        return { extension: "jpg", url: item.image_versions2.candidates?.[0]?.url }; // Return image URL with 'jpg' extension
    } else {
        console.error('Error: No valid video or image URL found');
        return null; // Return null if no valid URL is found
    }
};

/**
 * getMediaElement - Generates an HTML element (either an image or a video) based on the media type.
 * The element is used for displaying the media in a modal or UI component.
 * @param mediaType - The type of media (Video or Image).
 * @param url - The URL for the media (either an image or video URL).
 * @param storiesMuted - A setting to mute stories (applicable to video).
 * @returns A string containing the HTML media element (either `<video>` or `<img>`).
 */
export const getMediaElement = (mediaType, url, storiesMuted: boolean) => {
    // If the media type is Video, create a video element; otherwise, create an image element.
    return mediaType === MediaType.Video
        ? `<video style="background:black;" height="450" src="${url}" controls preload="metadata"${storiesMuted ? " muted" : ""}></video>` // Video element with optional mute
        : `<img src="${url}" />`; // Image element
};

/**
 * getMediaInfo - Retrieves the media information for a specific post or story.
 * Based on the URL path, it makes an API call to fetch relevant media info (e.g., reels, posts, or stories).
 * @param el - The HTML element containing the media to retrieve information for.
 * @param postId - The post ID for a specific media item (optional).
 * @param userId - The user ID for a specific media item (optional).
 * @returns A promise that resolves to the media information.
 */
export const getMediaInfo = async (el: HTMLElement, postId: string, userId: string): Promise<any> => {
    // If no postId is provided, fetch media info for reels or feed based on userId.
    if (!postId) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId });
    }

    // If the URL matches a "highlight" story, fetch media info for that highlight.
    if (window.location.pathname.startsWith("/stories/highlights/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: null });
    } else if (window.location.pathname.startsWith("/stories/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId });
    } else {
        // Otherwise, fetch general media info for posts or reels.
        return await fetchDataFromApi({ type: 'getMediaFromInfo', articleNode: el });
    }
};

/**
 * processMediaInfo - Processes the media info by iterating through all items (e.g., carousel media or individual media).
 * It invokes a callback for each media item to process it further.
 * @param mediaInfo - The media information containing one or more media items.
 * @param callback - A callback function to process each media item (e.g., to add it to the modal body).
 */
export const processMediaInfo = (mediaInfo: any, callback: any) => {
    let count = 0; // Initialize the count of media items.

    // If the media info contains reels media, process each item.
    if (mediaInfo.reels_media?.[0]?.items) {
        count = mediaInfo.reels_media[0].items.length;
        mediaInfo.reels_media[0].items.forEach((media, index) => {
            callback(media, index, count); // Pass the media, index, and total count to the callback
        });
    } else if (mediaInfo.items?.[0]?.carousel_media) {
        // If the media info contains carousel media, process each item in the carousel.
        count = mediaInfo.items[0].carousel_media.length;
        mediaInfo.items[0].carousel_media.forEach((media, index) => {
            callback(media, index, count); // Pass the media, index, and total count to the callback
        });
    } else if (mediaInfo.items?.[0]) {
        // If there is only a single media item, process it directly.
        count = 1;
        callback(mediaInfo.items[0], 0, count); // Single item case
    } else if (mediaInfo.user?.hd_profile_pic_url_info?.url) {
        // Handle the case where the media is a profile picture.
        count = 1;
        callback(mediaInfo.user.hd_profile_pic_url_info, 0, count); // Profile picture case
    }
};

/**
 * removeStyleTagsWithIDs - Removes <style> tags from the document that have IDs matching the provided list.
 * This function is useful for removing dynamically added styles that are no longer needed.
 * @param idsToRemove - An array of style tag IDs to remove from the document.
 */
export const removeStyleTagsWithIDs = (idsToRemove: string[]) => {
    // Select all <style> tags that have an ID attribute
    document.querySelectorAll("style[id]").forEach(styleTag => {
        // If the style tag's ID is in the list of IDs to remove, remove it from the DOM
        if (idsToRemove.includes(styleTag.id)) {
            styleTag.remove();
        }
    });
};

/**
 * resolveCurrentStoryIndex - Determines the index of the currently active story or post in a list of slides.
 * This function handles various selectors to account for different formats (e.g., story feeds, reels, posts).
 * @param el - The HTML element containing the stories or posts.
 * @returns The index of the currently active story or post, or 0 if none is found.
 */
export const resolveCurrentStoryIndex = (el: HTMLElement): number => {
    // If the element is null, return 0 immediately (no active story).
    if (!el) {
        return 0;
    }

    // Define an array of possible selectors for the root element of the slides
    const selectors = [
        "._acvz._acnc._acng", // For feed posts
        "section header div", // For stories on the feed
        ".x1ned7t2.x78zum5", // For stories/highlights in profiles
        "section > div header > div", // Unknown selector (possibly another format)
        "section > div > div > div > div > div > div > div > div", // Another unknown selector
        "div > div > div > div > div > div > div > div" // For posts, profile modal, and direct posts
    ];

    // Attempt to find the root element using each selector
    let slidesRoot: { children: Iterable<unknown> | ArrayLike<unknown> };
    for (var selector of selectors) {
        slidesRoot = el.querySelector(selector);
        if (slidesRoot) {
            break;
        }
    }

    // If no root element is found, return 0 (indicating no active story)
    if (!slidesRoot) {
        return 0;
    }

    // Collect all child elements of the root element, if any
    const slidesChildren: HTMLElement[] = slidesRoot ? Array.from(slidesRoot.children) as HTMLElement[] : [];

    // Iterate over each child and find the active slide
    for (let i = 0; i < slidesChildren.length; i++) {
        // Get all <div> elements inside each child
        const allDivs = slidesChildren[i].querySelectorAll('div');

        // Check if the divs array is empty
        if (allDivs.length === 0) {
            if (selector == "._acvz._acnc._acng") {
                // If the class list length of the child is greater than 1, it indicates an active state
                const classListLength = slidesChildren[i].classList.length;
                if (classListLength > 1) {
                    return i; // Return the index of the active slide
                }
            } else {
                continue;
            }
        } else {
            // Check if the story has expired (for stories in the feed)
            const spanElement = allDivs[0]?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.children[1]?.querySelector('span');
            if (spanElement) {
                // Find the index of the first div with nested elements to determine active state
                const targetIndex = Array.from(allDivs[0]?.parentNode?.parentNode?.children ?? []).findIndex(child => child.children.length > 0);
                return (slidesChildren.length - targetIndex) > 0 ? 0 : 0;
            } else {
                // If no expired story is detected, check the width or transform properties to determine the active slide
                for (const div of Array.from(allDivs)) {
                    const widthStyle = div.style.width;
                    const transformStyle = div.style.transform;

                    // If the width is not 100% or any transform property is present, it indicates the active slide
                    if ((widthStyle && widthStyle !== "100%") || (transformStyle && transformStyle.trim() !== "")) {
                        return i; // Return the index of the active slide
                    }
                }
            }
        }
    }

    // If no active slide is found, return 0 (indicating no active story)
    return 0;
};

// export function resolveExpiredStories(el) {
//     for (let i = 0; i < el.children.length; i++) {
//         // Check if this div or any of its children have the desired transform style
//         if (el.children[i].querySelector("[style*='transform: translateX(-100%)']")) {
//             return i // Return the index where the transform is found
//         }
//     }
//     return -1 // Return -1 if no such div is found
// }
/**
 * resolveElementMediaType - Determines the type of media (Image, Video, or Carousel) based on the properties of the provided media array.
 * This function is used to identify what kind of media is being processed (e.g., whether it's an image, video, or carousel).
 * @param mediaArray - The media item, which could be an image, video, or carousel.
 * @returns The media type as one of the values from `MediaType`: Carousel, Video, or Image.
 */
export const resolveElementMediaType = (mediaArray: { width?: any; height?: any; url?: string; carousel_media?: any; video_dash_manifest?: any; video_duration?: any; video_versions?: any }) => {
    // If the media contains carousel media, return MediaType.Carousel
    if (mediaArray.carousel_media) return MediaType.Carousel;

    // If the media contains video-related properties, return MediaType.Video
    if (mediaArray.video_dash_manifest || mediaArray.video_duration || mediaArray.video_versions) return MediaType.Video;

    // If no carousel or video properties are found, assume it's an image
    return MediaType.Image;
};

/**
 * resolveOverallMediaType - Placeholder function that returns an undefined media type.
 * This function can be used for future extensions or when there's a need to handle an unknown media type.
 * @returns MediaType.UNDEFINED (the default "undefined" media type).
 */
export const resolveOverallMediaType = () => {
    return MediaType.UNDEFINED; // Return undefined type, indicating no media type is specified.
};

/**
 * secureFetch - A secure wrapper around the `fetch` API that adds required headers, handles errors, and ensures CORS compatibility.
 * This function is designed to make network requests to Instagram's API or other services while managing app-specific headers.
 * @param url - The URL to fetch.
 * @param appId - The Instagram App ID used in the request header for authentication.
 * @returns A Promise that resolves with the JSON response or null if an error occurs.
 */
export const secureFetch = async (url: string, appId: string) => {
    try {
        // Perform a GET request to the specified URL with the required headers.
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: '*/*', 'X-IG-App-ID': appId },
            credentials: 'include',
            mode: 'cors',
        });

        // If the response status is not 200 (OK), log the status and return null
        if (response.status !== 200) {
            console.info(`Fetch API failed with status code: ${response.status}`);
            return null;
        }

        // If the request is successful, return the JSON response
        return await response.json();
    } catch (e) {
        // If there is an error during fetch, log the error and return null
        console.info(`Error fetching data: ${e}\n${e.stack}`);
        return null;
    }
};

/**
 * sleep - A simple utility function that returns a Promise that resolves after a specified amount of time (in milliseconds).
 * This function is useful for implementing delays in asynchronous code (e.g., for polling or rate-limiting purposes).
 * @param ms - The number of milliseconds to sleep.
 * @returns A Promise that resolves after the specified time has elapsed.
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * userFilenameFormatter - Formats a filename by replacing placeholders with actual values (e.g., date, username).
 * This function is typically used to generate file names for downloaded media (images, videos) in a structured format.
 * @param filename - The base filename that may contain placeholders.
 * @param placeholders - A map of placeholder values (e.g., `{Username}`, `{Year}`, `{Month}`) to replace in the filename.
 * @returns The formatted filename with the placeholders replaced by actual values.
 */
export const userFilenameFormatter = (filename: string, placeholders: Record<string, string>): string => {
    // Loop through each placeholder in the map and replace it with the corresponding value.
    for (const placeholder in placeholders) {
        const regex = new RegExp(`{${placeholder}}`, "g"); // Create a regular expression for the placeholder
        filename = filename.replace(regex, placeholders[placeholder]); // Replace the placeholder with its value
    }

    // After replacing all placeholders, clean up the filename by replacing spaces with dashes
    // and removing any non-word characters (except for dots and hyphens).
    return filename.replace(/\s+/g, "-").replace(/[^\w-.]/g, "");
};

// Wraps the provided modal body content in a slider container structure.
// This structure is typically used for displaying media (like images or videos) in a slider format.
export const wrapInSliderContainer = (modalBody) =>
    `<div class="slider-container"><div class="slider">${modalBody}</div><div class="slider-controls"></div></div>`;

// Resolves and returns the correct user profile URL based on the current path and username.
// This function adapts to different Instagram URLs (posts, reels, or general profile).
export const resolveUserLink = (rootUrl, path, userName) => {
    // If the path is related to a post or story, link to the user's profile.
    if (path.startsWith("/p/") || path.startsWith("/stories/")) {
        return `${rootUrl}/${userName}/`;
    } else if (path.startsWith("/reels/")) {
        // If it's a reel, provide the user’s reel page.
        return `${rootUrl}/${userName}/reels/`;
    } else {
        // For other paths, simply return the user's general profile URL.
        return `${rootUrl}/${userName}`;
    }
};

// Determines whether the provided element contains an advertisement.
// It checks for specific SVG paths and ad-related text to identify an ad.
export const findAD = (el: HTMLElement, isStory?: boolean): boolean => {
    // Check if the SVG path of an ad is present in the element.
    const isADPathPresent = (): boolean => {
        return Boolean(Array.from(el.querySelectorAll<SVGPathElement>("path"))
            .find(p => p.getAttribute("d") === "M21 17.502a.997.997 0 0 1-.707-.293L12 8.913l-8.293 8.296a1 1 0 1 1-1.414-1.414l9-9.004a1.03 1.03 0 0 1 1.414 0l9 9.004A1 1 0 0 1 21 17.502Z"));
    }

    // Helper function to extract ad text from the element.
    const getAdText = (): string | undefined => {
        try {
            return el.children[0]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0]?.children[0]?.children[1]?.children[1]?.children[0]?.textContent;
        } catch {
            return undefined;
        }
    }

    // If the element is part of a story, check if it contains ad text matching the localization.
    if (isStory) {
        const adText = getAdText();
        if (adText) {
            // Check if the ad text matches any localized advertisement text.
            return Object.values(localization.langs).some(locale => locale.ad === adText);
        }
        return false;
    }

    // For other cases, check for the ad SVG path presence.
    return isADPathPresent();
}

// Helper function to get the key for the React Fiber instance from an element.
// This function helps in accessing the React instance associated with a DOM element.
export function getReactFiberKey(element) {
    return Object.keys(element).find(key => key.includes('Instance') || key.includes('Fiber'));
}

/**
 * traverseReactDOMAndFindHidden - Traverses the React DOM starting from a given root element to find the first non-hidden 'DIV' element.
 * 
 * This function is useful in cases where you want to find a visible element in a React-based DOM, skipping any hidden ones.
 * It checks if the element's React Fiber node has a `hidden` property set to `true` in either its own `memoizedProps` or in its parent (`return`).
 * 
 * @param root - The root element from which to start the traversal.
 * @returns The first visible 'DIV' element found, or null if none is found.
 */
export const traverseReactDOMAndFindHidden = (root) => {
    const traverse = (node) => {
        if (!node) return null;
        const fiberNode = node[getReactFiberKey(node)]; // Get the React Fiber instance for the node
        // Check if the node or its parent is hidden by looking at the 'hidden' property in memoizedProps
        const isHidden = fiberNode?.memoizedProps?.hidden === true || fiberNode?.return?.memoizedProps?.hidden === true;
        return node.tagName === 'DIV' && !isHidden ? node : null; // Return the node if it's a DIV and not hidden
    };

    let child = root.firstElementChild; // Start with the first child of the root element
    while (child) {
        const result = traverse(child); // Traverse the current child
        if (result) return result; // If a non-hidden DIV is found, return it
        child = child.nextElementSibling; // Move to the next sibling element
    }
    return null; // Return null if no non-hidden DIV is found
};

/**
 * getElementWithHighestWidth - Finds the child element with the highest width within a given container element.
 * 
 * This function is used when you need to find the widest element among several children inside a container. 
 * It compares the width of each child and returns the one with the largest width.
 * 
 * @param el - The container element whose child elements will be examined.
 * @returns The child element with the highest width, or null if no child elements are found.
 */
export const getElementWithHighestWidth = (el: HTMLElement): HTMLElement | null => {
    if (!el) return null; // Return null if the container element is invalid
    const divs = el.querySelectorAll<HTMLElement>('div > div > div'); // Find all nested div elements
    if (divs.length === 0) return null; // Return null if no nested divs are found
    // Iterate through the divs and find the one with the highest width
    return Array.from(divs).reduce((maxDiv, currentDiv) => {
        const maxWidth = parseFloat(getComputedStyle(maxDiv).width); // Get the width of the current max width element
        const currentWidth = parseFloat(getComputedStyle(currentDiv).width); // Get the width of the current div
        return currentWidth > maxWidth ? currentDiv : maxDiv; // Return the element with the larger width
    }, divs[0]);
};

/**
 * getStoryWrapper - Returns the last section element within a given parent element.
 * 
 * This function is helpful when trying to find the last section (story) element in a container, for example in a story feed.
 * 
 * @param el - The parent element to search within.
 * @returns The last section element found, or undefined if no sections are found.
 */
export const getStoryWrapper = (el) => {
    const sections = [...el?.querySelectorAll("section") || []]; // Get all sections inside the parent element
    return sections[sections.length - 1]; // Return the last section element (i.e., the last story in the feed)
};

/**
 * getAllNodeParent - Returns all parent elements of a given element up to the root of the DOM.
 * 
 * This function is useful for traversing an element's ancestor hierarchy, especially when you need to check parent elements for specific properties.
 * 
 * @param el - The element for which to find the parents.
 * @returns An array of all parent elements, starting from the element itself up to the root.
 */
export const getAllNodeParent = (el: { parentNode: any; }) => {
    const parents = [];
    for (parents.push(el); el.parentNode;) {
        parents.unshift(el.parentNode); // Add each parent to the start of the array
        el = el.parentNode; // Move to the next parent
    }
    return parents; // Return the array of all parents
};

/**
 * getReactInstanceFromElement - Retrieves the React Fiber instance associated with a DOM element.
 * 
 * React uses Fiber as its internal data structure. This function helps you access the React instance (Fiber node) associated with a DOM element.
 * This can be useful for debugging or for accessing internal React properties.
 * 
 * @param el - The DOM element whose React Fiber instance you want to retrieve.
 * @returns The React Fiber instance associated with the element, or null if not found.
 */
export const getReactInstanceFromElement = (el: { [x: string]: any; }) => {
    // Find the key in the element that corresponds to the React Fiber instance
    const key = Object.keys(el).find((key) => key.includes("Instance") || key.includes("Fiber"));
    return key ? el[key] : null; // Return the React instance or null if not found
};

/**
 * compareMpegRepresentation - Compares two MPEG video representations based on quality and bandwidth.
 * 
 * This function is used for sorting video representations, typically to prioritize higher quality videos 
 * (HD over non-HD) and, if the quality is the same, to prefer videos with higher bandwidth.
 * 
 * @param a - The first video representation to compare, which includes `quality` (e.g., "hd" or "sd") and `bandwidth` (numerical value).
 * @param b - The second video representation to compare, which includes `quality` (e.g., "hd" or "sd") and `bandwidth` (numerical value).
 * @returns A negative number if `a` should come before `b`, a positive number if `a` should come after `b`, and 0 if they are equal.
 */
export const compareMpegRepresentation = (a: { quality: string; bandwidth: number; }, b: { quality: string; bandwidth: number; }) =>
    // First, prioritize HD videos by comparing quality
    a.quality === "hd" && b.quality !== "hd" ? -1 :  // If `a` is HD and `b` is not, `a` comes first
        a.quality !== "hd" && b.quality === "hd" ? 1 :   // If `b` is HD and `a` is not, `b` comes first
            // If both videos have the same quality, compare bandwidth (higher bandwidth is preferred)
            b.bandwidth - a.bandwidth;  // If quality is the same, return difference in bandwidth

/**
 * toMpegRepresentation - Converts an HTML element representing a video into an MPEG representation object.
 * This function extracts specific attributes (quality, bandwidth, and base URL) from the element 
 * to create a structured object representing the video properties.
 * 
 * @param el - The HTML element containing the video information.
 * @returns An object representing the video properties, including quality, bandwidth, and the base URL for the video.
 */
export const toMpegRepresentation = (el) => ({
    // Extract the 'FBQualityClass' attribute to determine the video quality (e.g., 'hd', 'sd')
    quality: el.getAttribute("FBQualityClass"),

    // Extract the 'bandwidth' attribute, converting it to a number using the unary plus operator (+)
    bandwidth: +el.getAttribute("bandwidth"),

    // Extract the 'BaseURL' element's text content, trimming whitespace. If not found, return null.
    baseUrl: el.querySelector("BaseURL")?.textContent?.trim() || null,
});

/**
 * getOriginalVideo - Retrieves the original video URL from an element or manifest.
 * 
 * This function first checks if the element has a valid `src` attribute pointing to the video.
 * If `src` is not available or is a `blob:` URL, it attempts to parse the `manifest` to find the video URL.
 * 
 * @param el - The HTML element that may contain the `src` attribute pointing to the video or a `manifest` for the video.
 * @param manifest - An optional string representing the video manifest, used if `src` is not available.
 * @returns The original video URL, or `null` if no valid video URL is found.
 */
export const getOriginalVideo = (el: { [x: string]: any; src?: any; }, manifest?: string) => {
    // If the element has a valid 'src' attribute and it's not a blob URL, return it directly.
    const src = el.src && !el.src.startsWith("blob:") ? el.src : null;
    if (src) return src;

    // If a manifest is provided or can be retrieved from the element's React instance, parse it to get the video URL.
    const videoManifest = manifest || getReactInstanceFromElement(el)?.return?.return?.memoizedProps?.manifest;
    if (!videoManifest) return null;

    // Parse the manifest string to extract the video representation.
    const doc = new DOMParser().parseFromString(videoManifest, "text/xml");
    const representations = Array.from(doc.querySelectorAll('Representation[mimeType="video/mp4"]'))
        .map(toMpegRepresentation) // Convert the video representations into structured objects.
        .filter(rep => rep.baseUrl) // Filter out representations without a base URL.
        .sort(compareMpegRepresentation); // Sort the representations to prefer higher quality and bandwidth.

    return representations[0]?.baseUrl || null; // Return the best representation's base URL, or null if none are found.
}

/**
 * isElementInViewport - Checks if an HTML element is currently visible within the viewport.
 * 
 * This function uses the `getBoundingClientRect()` method to check whether the element is within
 * the visible area of the browser window (viewport). It ensures that the entire element, or at least
 * part of it, is within the viewable area of the screen.
 * 
 * @param el - The element to check for visibility in the viewport.
 * @returns A boolean indicating whether the element is within the viewport (true) or not (false).
 */
export const isElementInViewport = (el) => {
    // Get the element's position and size relative to the viewport
    const { top, right, bottom, left } = el.getBoundingClientRect();

    // Check if the element's bottom is below the top of the viewport, 
    // its right is to the right of the left edge, and its left is within the window's width,
    // and its top is within the window's height.
    return bottom > 0 && right > 0 && left < window.innerWidth && top < window.innerHeight;
}

/**
 * isProfileImage - Determines if the provided HTML element is a profile image.
 * 
 * This function checks several conditions to identify a profile image:
 * - The element has a specific `data-testid` attribute (`user-avatar`).
 * - The element is small in size (less than 48px in width).
 * - The element is contained within a `span` or `a` tag, which are often used for profile images in social media.
 * - The element's ancestors include a `HEADER` tag, which typically surrounds profile-related elements.
 * 
 * @param el - The HTML element to check.
 * @returns A boolean indicating whether the element is identified as a profile image (true) or not (false).
 */
export const isProfileImage = (el) => {
    const parent = el.parentElement;

    // Check if the element has the 'data-testid' of 'user-avatar', or if it's smaller than 48px in width,
    // or if it's contained within a 'span' or 'a' tag, or if one of its ancestors is a 'HEADER' tag.
    return el.getAttribute("data-testid") === "user-avatar" ||
        el.width < 48 || // Consider images smaller than 48px as profile images
        ["span", "a"].includes(parent?.localName) || // Profile images are often wrapped in 'span' or 'a' tags
        getAllNodeParent(el).some(node => node.nodeName === "HEADER"); // Check if the element's parent is in a 'HEADER' element
}

/**
 * findMediaInSpecificElementAndChildren - Searches a specific DOM element and its children 
 * for media URLs (jpg and mp4). It traverses React Fiber nodes and checks for media properties 
 * (URLs pointing to images or videos) in nested objects or arrays.
 * 
 * @param el - The DOM element to start searching from. This element and its children will be checked for media URLs.
 */
export function findMediaInSpecificElementAndChildren(el) {
    const visitedNodes = new Set();

    // Function to search through React Fiber nodes for media
    function searchFiber(fiberNode) {
        if (!fiberNode || visitedNodes.has(fiberNode)) return;

        // Mark the current node as visited to prevent infinite loops
        visitedNodes.add(fiberNode);

        // Check if the current node's 'memoizedProps' contains a 'post' property with media
        if (fiberNode.memoizedProps && fiberNode.memoizedProps.post) {
            const postProp = fiberNode.memoizedProps.post;
            searchForMedia(postProp); // Search for 'jpg' or 'mp4' URLs in the 'post' property
        }

        // Recursively search the children and siblings of the current fiber node
        if (fiberNode.child) searchFiber(fiberNode.child);
        if (fiberNode.sibling) searchFiber(fiberNode.sibling);
    }

    // Function to recursively search objects and arrays for 'jpg' or 'mp4' URLs
    function searchForMedia(obj) {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                // Check if the value is a URL pointing to an image or video file
                if (obj[key].startsWith('http') && obj[key].includes('mp4')) {
                    console.log('MP4 URL found:', obj[key]);
                } else if (obj[key].startsWith('http') && obj[key].includes('jpg')) {
                    console.log('JPG URL found:', obj[key]);
                }
            } else if (typeof obj[key] === 'object') {
                // Recursively search nested objects or arrays
                searchForMedia(obj[key]);
            }
        }
    }

    // Function to search the provided element and its children for media
    function searchElementAndChildren(el) {
        // Search the provided element itself for media
        searchFiber(el);

        // Search all child elements of the current element
        const childElements = el.querySelectorAll('*'); // Select all child elements
        childElements.forEach((childElement) => {
            // Check if the child element has a React Fiber node associated with it
            const instanceKey = Object.keys(childElement).find(key => key.includes('Instance') || key.includes('Fiber'));
            const reactFiber = childElement[instanceKey];
            if (reactFiber) {
                searchFiber(reactFiber);  // Search the React Fiber nodes of the child element
            }
        });
    }

    // Start the search in the provided element and all its children
    searchElementAndChildren(el);
}

/**
 * findMediaUrl - Traverses through the DOM and React Fiber nodes to find media URLs 
 * (like video or image URLs) in the specified element and its children.
 * It supports searching for a specific property in the memoizedProps or looking for 
 * media files with URLs containing "mpd" (usually related to media sources such as videos).
 * 
 * @param el - The root element to start searching from.
 * @param propName - The property name to search for in the `memoizedProps` (optional).
 * @returns An object containing:
 *   - `mediaUrlElements`: A list of objects containing URLs and associated elements.
 *   - `mostFrequentUrl`: The most frequently found media URL.
 *   - `maxCount`: The number of times the most frequent URL appears.
 */
export function findMediaUrl(el, propName) {
    const visitedNodes = new Set(); // To keep track of visited React Fiber nodes
    const mediaUrlElements = []; // To store the media URLs and their associated elements

    // Recursive function to search through React Fiber nodes for media URLs
    function searchFiber(fiberNode, el) {
        if (!fiberNode || visitedNodes.has(fiberNode)) return; // If no fiber node or already visited

        // Mark the current fiber node as visited to avoid cycles
        visitedNodes.add(fiberNode);

        // Helper function to process memoizedProps to find media URLs
        function processMemoizedProps(memoizedProps, el) {
            if (propName) {
                // If propName is provided, search for that specific property
                if (memoizedProps[propName] && typeof memoizedProps[propName] === 'string') {
                    mediaUrlElements.push({
                        url: memoizedProps[propName], // Found URL
                        reactEl: memoizedProps, // Store the React element
                        element: el // Store the original DOM element
                    });
                }
            } else {
                // If no specific propName is provided, search for 'mpd' URLs (typically video URLs)
                for (const prop in memoizedProps) {
                    if (typeof memoizedProps[prop] === 'string' && memoizedProps[prop].includes('mpd')) {
                        mediaUrlElements.push({
                            url: memoizedProps[prop], // Found media URL
                            reactEl: memoizedProps, // Store the React element
                            element: el // Store the DOM element
                        });
                    }
                }
            }
        }

        // Process the current fiber node's memoizedProps
        if (fiberNode.memoizedProps) {
            processMemoizedProps(fiberNode.memoizedProps, el);
        }

        // Recursively search the children and siblings of the current fiber node
        if (fiberNode.child) searchFiber(fiberNode.child, el);
        if (fiberNode.sibling) searchFiber(fiberNode.sibling, el);

        // Traverse the return chain of React Fiber
        let currentReturn = fiberNode.return;
        while (currentReturn) {
            if (currentReturn.memoizedProps) {
                processMemoizedProps(currentReturn.memoizedProps, el);
            }
            currentReturn = currentReturn.return;
        }
    }

    // Function to traverse the entire DOM subtree and search for React Fiber nodes
    function traverseDom(el) {
        if (!el) return; // Exit if the element is null

        const instanceKey = Object.keys(el).find(key => key.includes('Instance') || key.includes('Fiber'));
        if (instanceKey) {
            const reactFiber = el[instanceKey]; // Get the React Fiber instance
            searchFiber(reactFiber, el); // Start searching through the fiber node
        }

        // Traverse all child elements of the current DOM element
        Array.from(el.children).forEach(child => traverseDom(child));
    }

    // Start the traversal from the provided root element
    traverseDom(el);

    // Count the frequency of each media URL found during the traversal
    const urlCounts = mediaUrlElements.reduce((acc, item) => {
        const url = item.url;
        if (url) {
            acc[url] = (acc[url] || 0) + 1; // Increment the count for each URL
        }
        return acc;
    }, {});

    // Find the most frequent media URL and its count
    let mostFrequentUrl = null;
    let maxCount = 0;
    for (const url in urlCounts) {
        if (urlCounts[url] > maxCount) {
            maxCount = urlCounts[url]; // Update the maximum count
            mostFrequentUrl = url; // Update the most frequent URL
        }
    }

    // Return the media URLs found, the most frequent URL, and its count
    return { mediaUrlElements, mostFrequentUrl, maxCount };
}

/**
 * processMediaUrls - Processes an array of media URL elements to extract the video URLs
 * using the `getOriginalVideo` function. Filters out null values and returns an array
 * of valid video URLs.
 * 
 * @param mediaUrlElements - An array of objects containing media URLs.
 * @returns An array of video URLs that have been successfully extracted.
 */
export const processMediaUrls = (mediaUrlElements) => {
    return mediaUrlElements.map(mediaElement => {
        // For each media element, extract the video URL using getOriginalVideo
        const videoUrl = getOriginalVideo(null, mediaElement.url);
        console.log(videoUrl); // Logs the extracted video URL to the console
        return videoUrl; // Return the extracted video URL
    })
        .filter(url => url !== null); // Filter out null values, if any
};