import { Program } from "../App"
import { MediaScanResult } from "../model/MediaScanResult"
import { MediaType } from "../model/MediaType"
import localization from "../localization"
import localize from "./localize"

const mediaIdCache: Map<string, string> = new Map()

export const findAppId = (): string | null => {
    const appIdPattern = /"X-IG-App-ID":"([\d]+)"/;
    const scripts = Array.from(document.querySelectorAll("body > script")) as HTMLScriptElement[]

    const script = scripts
        .map(s => s.textContent?.match(appIdPattern))
        .find(Boolean)

    return script ? script[1] : null
}
export const findPostId = (articleNode: HTMLElement) => {
    const pathname = window.location.pathname
    const segments = pathname.split('/')
    const prefixHandlers = {
        '/reel/': () => segments[2],
        '/reels/': () => segments[2],
        '/stories/': () => segments[3],
    }
    for (const prefix in prefixHandlers) {
        if (pathname.startsWith(prefix)) return prefixHandlers[prefix]();
    }
    const postIdPattern = /^\/p\/([^/]+)\//
    return Array.from(articleNode.querySelectorAll("a[href]"))
        .map(a => a.getAttribute("href").match(postIdPattern))
        .find(match => match)?.[1] || null
}
export async function findMediaId(postId: string) {
    const match = window.location.href.match(/www.instagram.com\/stories\/[^/]+\/(\d+)/)
    if (match) return match[1]
    if (!mediaIdCache.has(postId)) {
        const mediaIdPattern = /instagram:\/\/media\?id=(\d+)|["' ]media_id["' ]:["' ](\d+)["' ]/
        const postUrl = `https://www.instagram.com/p/${postId}/`
        const resp = await fetch(postUrl)
        const text = await resp.text()
        let idMatch = text.match(mediaIdPattern)
        if (!idMatch) {
            // Try another approach, if this will be often used insta will block you for a while
            const resp = await fetch(postUrl + "?__a=1&__d=dis")
            const text = await resp.text()
            idMatch = text.match(/"pk":(\d+)/)
            if (!idMatch) {
                return null
            }
        }
        let mediaId = null
        for (let i = 0; i < idMatch.length; ++i) {
            if (idMatch[i]) {
                mediaId = idMatch[i]
            }
        }
        if (!mediaId) {
            return null
        }
        mediaIdCache.set(postId, mediaId)
    }
    return mediaIdCache.get(postId)
}
export const fetchDataFromApi = async (config) => {
    const { type, articleNode, id, userName, userId } = config
    const appId = findAppId()
    if (!appId) {
        console.log('AppID not found')
        return null
    }

    const urlMap = {
        'getReelsMediaFromFeed': async () => {
            const mediaId = id || await findMediaId(findPostId(articleNode))
            if (!mediaId) return null
            return `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id ? '' : 'highlight%3A'}${mediaId}`
        },
        'getMediaFromInfo': async () => {
            const mediaId = await findMediaId(findPostId(articleNode))
            if (!mediaId) return null
            return `https://i.instagram.com/api/v1/media/${mediaId}/info/`
        },
        'getUserFromInfo': () => `https://i.instagram.com/api/v1/users/${userId}/info/`,
        'getUserInfoFromWebProfile': () => `https://i.instagram.com/api/v1/users/web_profile_info/?username=${userName}`,
    }
    const url = await urlMap[type]?.()
    if (!url) return null
    return secureFetch(url, appId)
}
export const generateModalBody = async (el: HTMLElement, program: Program) => {
    const isPathMatch = (path: string) => window.location.pathname.startsWith(path)
    let userName = getIGUsername(window.location.href)
    const postId = findPostId(el)
    const userId = isPathMatch("/stories/")
        ? (await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName }))?.data?.user?.id ?? null
        : null
    let modalBody = ""
    const mediaInfo = await getMediaInfo(el, postId, userId)
    if (userName === postId && (isPathMatch("/p/") || isPathMatch("/reels/"))) {
        userName = mediaInfo.items?.[0]?.user?.username
    } else {
        const userFromReels = mediaInfo.reels_media?.[0]?.user?.username
        const userFromItems = mediaInfo.items?.[0]?.user?.username
        userName = userFromReels || userFromItems || userName
    }
    const userLink = resolveUserLink('https://www.instagram.com', window.location.pathname, userName)
    if (program.settings.showAds && findAD(el, isPathMatch("/stories/"))) {
        const targetNode = el.querySelector("video[playsinline]") || el.querySelector('img[draggable]')
        if (!targetNode) return { found: false }
        const body = document.body
        const videos = body.querySelectorAll("video") || []
        const storyWrapper = getStoryWrapper(body)
        const images = storyWrapper.querySelectorAll('img[draggable="false"]') || []
        const filteredImage = Array.from(images).find(img => isElementInViewport(img) && !isProfileImage(img)) as HTMLImageElement | undefined
        let mediaUrl = ""
        let mediaType = null
        if (videos.length) {
            const section = getAllNodeParent(videos[0]).reverse().find(el => el.nodeName === "SECTION")
            const instance = getReactInstanceFromElement(section)
            mediaUrl = instance?.return?.memoizedProps?.post?.videoUrl || getOriginalVideo(videos[0])
            mediaType = MediaType.Video
        } else if (filteredImage?.src && !filteredImage.src.startsWith("data:")) {
            mediaUrl = filteredImage.src
            mediaType = MediaType.Image
        }
        if (mediaUrl) {
            const { formattedFilename, url } = getFormattedFilenameAndUrl(mediaUrl, userName, program.settings.formattedFilenameInput, 0)
            const mediaElement = getMediaElement(mediaType, url, program.settings.storiesMuted)
            const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`
            const downloadUrl = program.settings.openInNewTab ? url : encodedUrl
            modalBody += `
                <div class="slide">
                    ${mediaElement}
                    <a href="${downloadUrl}" style="width:inherit;font-size:20px;font-weight:600;margin-top:-4px;" 
                       ${program.settings.openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} 
                       class="${program.NAME}-modal-db">${localize("download")}
                    </a>
                </div>`
            return {
                found: true,
                mediaType: resolveOverallMediaType(),
                mediaInfo,
                modalBody: wrapInSliderContainer(modalBody),
                selectedSliderIndex: 0,
                userName,
                userLink,
            }
        }
        return { found: false }
    }
    if (program.settings.noMultiStories && mediaInfo.reels_media?.[0]?.items.length > 0) {
        const sIndex = resolveCurrentStoryIndex(el, 'noMultiStories')
        modalBody = addMediaToBody(modalBody, mediaInfo.reels_media[0].items[sIndex], sIndex, userName, program)
    } else {
        processMediaInfo(mediaInfo, (media, index, _count) => {
            modalBody = addMediaToBody(modalBody, media, index, userName, program)
        })
    }

    const sliderHtml = wrapInSliderContainer(modalBody)
    const selectedSliderIndex = resolveCurrentStoryIndex(el, 'selectedSliderIndex')
    return {
        found: true,
        mediaType: resolveOverallMediaType(),
        mediaInfo,
        modalBody: sliderHtml,
        selectedSliderIndex,
        userName,
        userLink,
    }
}
export async function generateModalBodyHelper(el: HTMLElement, mediaInfo, userName: string, userLink: string, program: Program): Promise<MediaScanResult | null> {
    let modalBody = ""
    let itemCount = 0
    if (program.settings.noMultiStories && mediaInfo.reels_media?.[0]?.items.length > 0) {
        const itemIndex = resolveCurrentStoryIndex(el, 'noMultiStories')
        modalBody = addMediaToBody(modalBody, mediaInfo.reels_media[0].items[itemIndex], itemIndex, userName, program)
        itemCount = 1 // Da nur ein Element verarbeitet wird
    } else {
        processMediaInfo(mediaInfo, (media, index, _count) => {
            modalBody = addMediaToBody(modalBody, media, index, userName, program)
        })
    }
    const sliderHtml = wrapInSliderContainer(modalBody)
    const selectedSliderIndex = itemCount > 0 ? resolveCurrentStoryIndex(el, 'selectedSliderIndex') : 0
    return { found: true, mediaType: resolveOverallMediaType(), mediaInfo, modalBody: sliderHtml, selectedSliderIndex, userName, userLink: userLink }
}
export const addMediaToBody = (modalBody: string, media: any, index: number, userName: string, program: Program): string => {
    const { formattedFilename, url } = getFormattedFilenameAndUrl(media, userName, program.settings.formattedFilenameInput, index)
    const mediaElement = getMediaElement(resolveElementMediaType(media), url, program.settings.storiesMuted)

    const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(url)}:${btoa(formattedFilename)}`
    const downloadUrl = program.settings.openInNewTab ? url : encodedUrl

    return modalBody + `
        <div class="slide">
            ${mediaElement}
            <a href="${downloadUrl}" style="width:inherit;font-size:20px;font-weight:600;margin-top:-4px;" 
               ${program.settings.openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} 
               class="${program.NAME}-modal-db">${localize("download")}
            </a>
        </div>`
}
export const getBrowserInfo = () => {
    const ua = navigator.userAgent
    const match = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    let temp
    if (/trident/i.test(match[1])) {
        temp = /\brv[ :]+(\d+)/g.exec(ua) || []
        return { name: 'IE', version: temp[1] || '' }
    }
    if (match[1] === 'Chrome') {
        temp = ua.match(/\b(OPR|Edge)\/(\d+)/)
        if (temp) return { name: temp[1].replace('OPR', 'Opera'), version: temp[2] }
    }
    if (match.length > 1) {
        const versionMatch = ua.match(/version\/(\d+)/i)
        if (versionMatch) match[2] = versionMatch[1]
        return { name: match[1], version: match[2] }
    }
    return { name: navigator.appName, version: navigator.appVersion }
}
export const getElementInViewPercentage = (el: HTMLElement): number => {
    if (!el?.getBoundingClientRect) return 0;

    const { top, bottom } = el.getBoundingClientRect();
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.innerHeight;
    const elementTop = top + window.scrollY;
    const elementBottom = bottom + window.scrollY;

    if (viewportTop > elementBottom || viewportBottom < elementTop) return 0;

    const visibleHeight = Math.min(viewportBottom, elementBottom) - Math.max(viewportTop, elementTop);
    const elementHeight = bottom - top;

    return Math.round((visibleHeight / elementHeight) * 100);
}
export const getFormattedFilenameAndUrl = (media, userName: string, template: string, index: number) => {
    let placeholders = {}

    if (media && typeof media === "object" && media.height && media.width && media.url) {
        return { formattedFilename: `${userName}.jpg`, url: media.url }
    }

    if (typeof media === "string") {
        const date = new Date()
        placeholders = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName
        }
        const filename = userFilenameFormatter(template, placeholders)
        return { formattedFilename: `${filename}_${index + 1}.txt`, url: media }
    } else if (media && typeof media === "object") {
        const date = new Date(media.taken_at * 1000)
        placeholders = {
            Minute: date.getMinutes().toString().padStart(2, "0"),
            Hour: date.getHours().toString().padStart(2, "0"),
            Day: date.getDate().toString().padStart(2, "0"),
            Month: (date.getMonth() + 1).toString().padStart(2, "0"),
            Year: date.getFullYear().toString(),
            Username: userName
        }
        const filename = userFilenameFormatter(template, placeholders)
        const { extension, url } = getImgOrVideoUrl(media)
        return { formattedFilename: `${filename}_${index + 1}.${extension}`, url: url }
    } else {
        throw new Error("Unsupported media type")
    }
}
export const getIGUsername = (url: string): string => {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/
    const match = url.match(regex)
    return match ? match[2] : null
}
export const getImgOrVideoUrl = (item: Record<string, any>) => {
    if (item.items) {
        if ("video_versions" in item && item.items[0]?.video_versions?.[0]?.url) {
            return { extension: "mp4", url: item.items[0].video_versions[0].url };
        } else if (item.items[0]?.image_versions2?.candidates?.[0]?.url) {
            return { extension: "jpg", url: item.items[0].image_versions2.candidates[0].url };
        } else {
            console.error('Error: No valid video or image URL found in item.items[0]');
            return null; // Or handle the error appropriately
        }
    }
    if ("video_versions" in item && item.video_versions?.[0]?.url) {
        return { extension: "mp4", url: item.video_versions[0].url };
    } else if (item.image_versions2?.candidates?.[0]?.url) {
        return { extension: "jpg", url: item.image_versions2.candidates[0].url };
    } else {
        console.error('Error: No valid video or image URL found');
        return null; // Or handle the error appropriately
    }
};
export const getMediaElement = (mediaType, url, storiesMuted: boolean) => {
    return mediaType === MediaType.Video
        ? `<video style="background:black;" height="450" src="${url}" controls preload="metadata"${storiesMuted ? " muted" : ""}></video>`
        : `<img src="${url}" />`;
}
export const getMediaInfo = async (el: HTMLElement, postId: string, userId: string): Promise<any> => {
    if (!postId) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId });
    }
    if (window.location.pathname.startsWith("/stories/highlights/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: null });
    } else if (window.location.pathname.startsWith("/stories/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId });
    } else {
        return await fetchDataFromApi({ type: 'getMediaFromInfo', articleNode: el });
    }
}
export const processMediaInfo = (mediaInfo: any, callback: any) => {
    let count = 0;

    if (mediaInfo.reels_media?.[0]?.items) {
        count = mediaInfo.reels_media[0].items.length;
        mediaInfo.reels_media[0].items.forEach((media, index) => {
            callback(media, index, count); // Pass the count to the callback
        });
    } else if (mediaInfo.items?.[0]?.carousel_media) {
        count = mediaInfo.items[0].carousel_media.length;
        mediaInfo.items[0].carousel_media.forEach((media, index) => {
            callback(media, index, count); // Pass the count to the callback
        });
    } else if (mediaInfo.items?.[0]) {
        count = 1;
        callback(mediaInfo.items[0], 0, count); // Single item case
    } else if (mediaInfo.user?.hd_profile_pic_url_info?.url) {
        count = 1;
        callback(mediaInfo.user.hd_profile_pic_url_info, 0, count); // Profile picture case
    }
};
export const removeStyleTagsWithIDs = (idsToRemove: string[]) => {
    document.querySelectorAll("style[id]").forEach(styleTag => {
        if (idsToRemove.includes(styleTag.id)) {
            styleTag.remove();
        }
    });
}
export const resolveCurrentStoryIndex = (el: HTMLElement, _step: string): number => {
    // If the element is null, return -1 immediately
    if (!el) {
        return 0
    }
    // Define an array of possible selectors for the slides root
    const selectors = [
        "._acvz._acnc._acng", // this is for feed posts
        "section header div", // this is for stories on the feed
        ".x1ned7t2.x78zum5", // this is for stories/highlights in profile
        "section > div header > div", // forgotten, dont know
        "section > div > div > div > div > div > div > div > div", // forgotten, dont know
        "div > div > div > div > div > div > div > div" // this is for the following: feed posts, profile modal and direct posts, 
    ]
    // Attempt to find the root element using each selector
    let slidesRoot: { children: Iterable<unknown> | ArrayLike<unknown> }
    for (var selector of selectors) {
        slidesRoot = el.querySelector(selector)
        if (slidesRoot) {
            break
        }
    }
    if (!slidesRoot) {
        return 0 // Return 0 if no root element is found
    }
    // Collect all child elements of the root, if any
    const slidesChildren: HTMLElement[] = slidesRoot ? Array.from(slidesRoot.children) as HTMLElement[] : []
    // Find the index of the first child with nested elements
    for (let i = 0; i < slidesChildren.length; i++) {
        // Get all div elements inside each child
        const allDivs = slidesChildren[i].querySelectorAll('div')
        //Check if allDivs is empty
        if (allDivs.length === 0) {
            if (selector == "._acvz._acnc._acng") {
                // Count classes directly on slidesChildren[i]
                const classListLength = slidesChildren[i].classList.length // if length is greater than 1 it have an active state
                if (classListLength > 1) {
                    return i // Return the index of the child
                }
            } else {
                continue
            }
        } else {
            // Check for expired stories
            const spanElement = allDivs[0]?.parentNode?.parentNode?.parentNode?.parentNode?.parentNode?.children[1]?.querySelector('span')
            if (spanElement) {
                const targetIndex = Array.from(allDivs[0]?.parentNode?.parentNode?.children ?? []).findIndex(child => child.children.length > 0)
                return (slidesChildren.length - targetIndex) > 0 ? 0 : 0
            } else {
                for (const div of Array.from(allDivs)) {
                    const widthStyle = div.style.width
                    const transformStyle = div.style.transform
                    // Check for width not 100% or any transform property present
                    if ((widthStyle && widthStyle !== "100%") || (transformStyle && transformStyle.trim() !== "")) {
                        return i // Return the index of the selected slider
                    }
                }
            }
        }
    }
    return 0 // Return 0 if no selected slider is found
}
// export function resolveExpiredStories(el) {
//     for (let i = 0; i < el.children.length; i++) {
//         // Check if this div or any of its children have the desired transform style
//         if (el.children[i].querySelector("[style*='transform: translateX(-100%)']")) {
//             return i // Return the index where the transform is found
//         }
//     }
//     return -1 // Return -1 if no such div is found
// }
export const resolveElementMediaType = (mediaArray: { width?: any; height?: any; url?: string; carousel_media?: any; video_dash_manifest?: any; video_duration?: any; video_versions?: any }) => {
    if (mediaArray.carousel_media) return MediaType.Carousel
    if (mediaArray.video_dash_manifest || mediaArray.video_duration || mediaArray.video_versions) return MediaType.Video
    return MediaType.Image
}
export const resolveOverallMediaType = () => {
    return MediaType.UNDEFINED
}
export const secureFetch = async (url, appId) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: '*/*', 'X-IG-App-ID': appId },
            credentials: 'include',
            mode: 'cors',
        })
        if (response.status !== 200) {
            console.info(`Fetch API failed with status code: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (e) {
        console.info(`Error fetching data: ${e}\n${e.stack}`)
        return null
    }
}
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
export const userFilenameFormatter = (filename: string, placeholders: Record<string, string>): string => {
    for (const placeholder in placeholders) {
        const regex = new RegExp(`{${placeholder}}`, "g")
        filename = filename.replace(regex, placeholders[placeholder])
    }
    return filename.replace(/\s+/g, "-").replace(/[^\w-.]/g, "")
}
export const wrapInSliderContainer = (modalBody) => `<div class="slider-container"><div class="slider">${modalBody}</div><div class="slider-controls"></div></div>`;
export const resolveUserLink = (rootUrl, path, userName) => {
    if (path.startsWith("/p/") || path.startsWith("/stories/")) {
        return `${rootUrl}/${userName}/`
    } else if (path.startsWith("/reels/")) {
        return `${rootUrl}/${userName}/reels/`
    } else {
        return `${rootUrl}/${userName}`
    }
}
export const findAD = (el: HTMLElement, isStory?: boolean): boolean => {
    const isADPathPresent = (): boolean => {
        return Boolean(Array.from(el.querySelectorAll<SVGPathElement>("path"))
            .find(p => p.getAttribute("d") === "M21 17.502a.997.997 0 0 1-.707-.293L12 8.913l-8.293 8.296a1 1 0 1 1-1.414-1.414l9-9.004a1.03 1.03 0 0 1 1.414 0l9 9.004A1 1 0 0 1 21 17.502Z"));
    }
    const getAdText = (): string | undefined => {
        try {
            return el.children[0]?.children[0]?.children[0]?.children[0]?.children[0]?.children[1]?.children[0]?.children[0]?.children[1]?.children[1]?.children[0]?.textContent;
        } catch {
            return undefined
        }
    }
    if (isStory) {
        const adText = getAdText()
        if (adText) {
            return Object.values(localization.langs).some(locale => locale.ad === adText)
        }
        return false
    }
    return isADPathPresent()
}
export function getReactFiberKey(element) {
    return Object.keys(element).find(key => key.includes('Instance') || key.includes('Fiber'))
}
export const traverseReactDOMAndFindHidden = (root) => {
    const traverse = (node) => {
        if (!node) return null
        const fiberNode = node[getReactFiberKey(node)]
        const isHidden = fiberNode?.memoizedProps?.hidden === true || fiberNode?.return?.memoizedProps?.hidden === true
        return node.tagName === 'DIV' && !isHidden ? node : null
    }
    let child = root.firstElementChild
    while (child) {
        const result = traverse(child)
        if (result) return result
        child = child.nextElementSibling
    }
    return null
}
export const getElementWithHighestWidth = (el: HTMLElement): HTMLElement | null => {
    if (!el) return null
    const divs = el.querySelectorAll<HTMLElement>('div > div > div')
    if (divs.length === 0) return null
    return Array.from(divs).reduce((maxDiv, currentDiv) => {
        const maxWidth = parseFloat(getComputedStyle(maxDiv).width)
        const currentWidth = parseFloat(getComputedStyle(currentDiv).width)
        return currentWidth > maxWidth ? currentDiv : maxDiv
    }, divs[0])
}
export const getStoryWrapper = (el) => {
    const sections = [...el?.querySelectorAll("section") || []]
    return sections[sections.length - 1]
}
export const getAllNodeParent = (el) => {
    const parents = []
    for (parents.push(el); el.parentNode;) {
        parents.unshift(el.parentNode)
        el = el.parentNode
    }
    return parents
}
export const getReactInstanceFromElement = (element) => {
    const key = Object.keys(element).find((key) => key.includes("Instance") || key.includes("Fiber"))
    return key ? element[key] : null
}
export const compareMpegRepresentation = (a, b) =>
    a.quality === "hd" && b.quality !== "hd" ? -1 :
        a.quality !== "hd" && b.quality === "hd" ? 1 :
            b.bandwidth - a.bandwidth
export const toMpegRepresentation = (el) => ({
    quality: el.getAttribute("FBQualityClass"),
    bandwidth: +el.getAttribute("bandwidth"),
    baseUrl: el.querySelector("BaseURL")?.textContent?.trim() || null,
})
export const getOriginalVideo = (el) => {
    const src = el.src && !el.src.startsWith("blob:") ? el.src : null
    if (src) return src
    const manifest = getReactInstanceFromElement(el)?.return?.return?.memoizedProps?.manifest
    if (!manifest) return null
    const doc = new DOMParser().parseFromString(manifest, "text/xml")
    return Array.from(doc.querySelectorAll('Representation[mimeType="video/mp4"]'))
        .map(toMpegRepresentation)
        .filter(rep => rep.baseUrl)
        .sort(compareMpegRepresentation)[0]?.baseUrl || null
}
export const isElementInViewport = (el) => {
    const { top, right, bottom, left } = el.getBoundingClientRect()
    return bottom > 0 && right > 0 && left < window.innerWidth && top < window.innerHeight
}
export const isProfileImage = (el) => {
    const parent = el.parentElement
    return el.getAttribute("data-testid") === "user-avatar" ||
        el.width < 48 ||
        ["span", "a"].includes(parent?.localName) ||
        getAllNodeParent(el).some(node => node.nodeName === "HEADER")
}
