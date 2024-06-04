import { Program } from "../App"
import { MediaScanResult } from "../model/MediaScanResult"
import { MediaType } from "../model/MediaType"
import localize from "./localize"

const mediaIdCache: Map<string, string> = new Map()

export function findAppId() {
    const appIdPattern = /"X-IG-App-ID":"([\d]+)"/
    const bodyScripts: NodeListOf<HTMLScriptElement> = document.querySelectorAll("body > script")
    for (let i = 0; i < bodyScripts.length; ++i) {
        const match = bodyScripts[i].text.match(appIdPattern)
        if (match) return match[1]
    }
    return null
}
export function findPostId(articleNode: HTMLElement) {
    const pathname = window.location.pathname
    const segments = pathname.split('/')
    // Handling known path prefixes with a mapping object
    const prefixHandlers = {
        '/reel/': () => segments[2],
        '/reels/': () => segments[2],
        '/stories/': () => segments[3]
    }
    // Check if the current pathname starts with any known prefix
    for (const prefix in prefixHandlers) {
        if (pathname.startsWith(prefix)) {
            return prefixHandlers[prefix]()
        }
    }
    // Default case for non-prefix URLs
    const postIdPattern = /^\/p\/([^/]+)\//
    const aNodes: NodeListOf<HTMLElement> = articleNode.querySelectorAll("a[href]")
    const aNodeArray = Array.from(aNodes)
    for (const aNode of aNodeArray) {
        const link = aNode.getAttribute("href")
        const match = link.match(postIdPattern)
        if (match) return match[1]
    }
    return null
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
export async function fetchDataFromApi(config) {
    const { type, articleNode, id, userName, userId } = config
    const appId = findAppId()
    if (!appId) {
        console.log(`${type}() Cannot find appId`)
        return null
    }
    let url
    let mediaId
    switch (type) {
        case 'getReelsMediaFromFeed':
            mediaId = id || await findMediaId(findPostId(articleNode))
            if (!mediaId) {
                console.log(`${type}() Cannot find media id`)
                return null
            }
            url = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id ? '' : 'highlight%3A'}${mediaId}`
            break
        case 'getMediaFromInfo':
            mediaId = await findMediaId(findPostId(articleNode))
            if (!mediaId) {
                console.log(`${type}() Cannot find media id`)
                return null
            }
            url = `https://i.instagram.com/api/v1/media/${mediaId}/info/`
            break
        case 'getUserFromInfo':
            url = `https://i.instagram.com/api/v1/users/${userId}/info/`
            break
        case 'getUserInfoFromWebProfile':
            url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${userName}`
            break
        default:
            console.log('Unsupported type of API request')
            return null
    }
    return secureFetch(url, appId)
}
export async function generateModalBody(el: HTMLElement, program: Program) {
    const postId = findPostId(el)
    let userName = getIGUsername(window.location.href)
    let userLink = null
    console.log("generateModalBody() postId", postId, "userName", userName)
    const userId = window.location.pathname.startsWith("/stories/") ? (await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName: userName })).data.user.id : null
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mediaInfo: any | null = await getMediaInfo(el, postId, userId)
    if (!mediaInfo) return null
    console.log("generateModalBody() mediaInfo", mediaInfo)
    console.log('userName == postId', userName == postId)
    const isPathMatch = path => window.location.pathname.startsWith(path)
    if (userName === postId && (isPathMatch("/p/") || isPathMatch("/reels/"))) {
        if (mediaInfo.items && mediaInfo.items[0] && mediaInfo.items[0].user) {
            userName = mediaInfo.items[0].user.username
            userLink = resolveUserLink('https://www.instagram.com', window.location.pathname, userName)
        }
    } else {
        // Check if reels_media and its elements are defined
        const userFromReels = mediaInfo.reels_media && mediaInfo.reels_media[0] && mediaInfo.reels_media[0].user && isPathMatch("/stories/")
        // Check if items and its elements are defined
        const userFromItems = mediaInfo.items && mediaInfo.items[0] && mediaInfo.items[0].user

        if (userFromReels || userFromItems) {
            userName = userFromReels ? mediaInfo.reels_media[0].user.username : mediaInfo.items[0].user.username
            userLink = resolveUserLink('https://www.instagram.com', window.location.pathname, userName)
        }
        console.log('userName', userName)
    }
    // if (mediaInfo && mediaInfo.user && mediaInfo.user.username) {
    //     userName = mediaInfo.user.username
    // } else {
    //     const mediaInfoText = JSON.stringify(mediaInfo)
    //     const usernameMatch = mediaInfoText.match(/"username":"(.*?)"/)
    //     userName = usernameMatch ? usernameMatch[1] : null
    // }
    // console.log("generateModalBody() userName", userName)
    return await generateModalBodyHelper(el, mediaInfo, userName, userLink, program)
}
export async function generateModalBodyHelper(el: HTMLElement, mediaInfo, userName: string, userLink: string, program: Program): Promise<MediaScanResult | null> {
    let modalBody = ""
    const settings = {
        showAds: localStorage.getItem(`${program.STORAGE_NAME}_settings_general_1`) === "true",
        openInNewTab: localStorage.getItem(`${program.STORAGE_NAME}_settings_general_2`) === "true",
        autoSlideshow: localStorage.getItem(`${program.STORAGE_NAME}_settings_general_3`) === "true",
        formattedFilenameInput: localStorage.getItem(`${program.STORAGE_NAME}_settings_general_4`) || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}",
        mutedStories: localStorage.getItem(`${program.STORAGE_NAME}_settings_stories_1`) === "true",
        noMultiStories: localStorage.getItem(`${program.STORAGE_NAME}_settings_stories_3`) === "true"
    }

    console.log(localStorage.getItem(`${program.STORAGE_NAME}_settings_general_4`));
    console.log(settings.formattedFilenameInput);

    const addMediaToBody = (media, index) => {
        console.log('GOOO')
        let URL: string
        let FORMATTED_FILENAME: string
        if (media && media.width && media.height && media.url) {
            URL = media.url
            FORMATTED_FILENAME = "profile_pic.jpg"
        } else {
            const { formattedFilename, url } = getFormattedFilenameAndUrl(media, userName, settings.formattedFilenameInput, index)
            URL = url
            FORMATTED_FILENAME = formattedFilename
        }

        const mediaType = resolveElementMediaType(media)
        const mediaElement = getMediaElement(mediaType, URL, settings.mutedStories)

        const encodedUrl = `https://instantgram.1337.pictures/download.php?data=${btoa(URL)}:${btoa(FORMATTED_FILENAME)}`
        const downloadUrl = settings.openInNewTab ? URL : encodedUrl

        modalBody += `<div class="slide">${mediaElement}<a href="${downloadUrl}" style="width:inherit;font-size:20px;font-weight:600;margin-top:-4px;" ${settings.openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ''} class="${program.NAME}-modal-db">${localize("index@download")}</a></div>`
    }

    let itemCount = 0
    if (settings.noMultiStories && mediaInfo.reels_media && mediaInfo.reels_media.length > 0 && mediaInfo.reels_media[0].items.length > 0) {
        itemCount = resolveCurrentSliderIndex(el)
        addMediaToBody(mediaInfo.reels_media[0].items[itemCount], itemCount)
    } else {
        itemCount = processMediaInfo(mediaInfo, addMediaToBody)
    }

    const sliderHtml = wrapInSliderContainer(modalBody)
    const selectedSliderIndex = itemCount > 0 ? resolveCurrentSliderIndex(el) : 0

    return { found: true, mediaType: resolveOverallMediaType(), mediaInfo, modalBody: sliderHtml, selectedSliderIndex, userName, userLink: userLink }
}
export function getBrowserInfo() {
    const ua = navigator.userAgent
    let tem,
        M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || []
        return { name: 'IE', version: (tem[1] || '') }
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/)
        if (tem != null) return { name: tem[1].replace('OPR', 'Opera'), version: tem[2] }
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?']
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1])
    return { name: M[0], version: M[1] }
}
export function getCurrentStory(el: HTMLElement) {
    // Handle the case where the element might not be found
    if (!el) {
        console.log("Element not found")
        return 0
    }
    // Initialize variables to keep track of the tallest element and its height
    let tallestElement: HTMLElement | null = null
    let maxHeight = 0
    // Iterate over each child element of the parent
    el.childNodes.forEach(node => {
        // Ensure the node is an HTMLElement to access offsetHeight
        if (node instanceof HTMLElement) {
            const height = node.offsetHeight // Includes padding but not margins

            // Update tallestElement if the current child's height is greater than maxHeight
            if (height > maxHeight) {
                maxHeight = height
                tallestElement = node
            }
        }
    })
    // Return the tallest element found or null if there are no HTMLElement children
    return tallestElement
}
export function getElementInViewPercentage(el: HTMLElement): number {
    if (!el || !el.getBoundingClientRect) return 0

    const { top, bottom } = el.getBoundingClientRect()
    const viewportTop = window.scrollY || document.documentElement.scrollTop
    const viewportBottom = viewportTop + window.innerHeight
    const elementTop = top + window.scrollY
    const elementBottom = bottom + window.scrollY

    if (viewportTop > elementBottom || viewportBottom < elementTop) return 0

    const visibleTop = Math.max(viewportTop, elementTop)
    const visibleBottom = Math.min(viewportBottom, elementBottom)
    const visibleHeight = visibleBottom - visibleTop
    const elementHeight = bottom - top

    return Math.round((visibleHeight / elementHeight) * 100)
}
export function getFormattedFilenameAndUrl(media, userName: string, template: string, index: number) {
    const date = new Date(media.taken_at * 1000)
    const placeholders = {
        Minute: date.getMinutes().toString().padStart(2, "0"),
        Hour: date.getHours().toString().padStart(2, "0"),
        Day: date.getDate().toString().padStart(2, "0"),
        Month: (date.getMonth() + 1).toString().padStart(2, "0"),
        Year: date.getFullYear().toString(),
        Username: userName
    }
    const filename = userFilenameFormatter(template, placeholders)
    const { extension, url } = getImgOrVideoUrl(media)
    return { formattedFilename: filename + "_" + Number(index + 1) + "." + extension, url: url }
}
export function getIGUsername(url: string): string {
    const regex = /https:\/\/www\.instagram\.com\/(stories\/|reels\/|p\/)?([^/?]+)/
    const match = url.match(regex)
    if (match && match.length > 2) {
        return match[2] // The username is in the second capturing group
    }
    return null // Return null if no username is found
}
export function getImgOrVideoUrl(item: Record<string, any>) {
    if (item.items) {
        if ("video_versions" in item) {
            return { extension: "mp4", url: item.items[0].video_versions[0].url }
        } else {
            return { extension: "jpg", url: item.items[0].image_versions2.candidates[0].url }
        }
    }
    if ("video_versions" in item) {
        return { extension: "mp4", url: item.video_versions[0].url }
    } else {
        return { extension: "jpg", url: item.image_versions2.candidates[0].url }
    }
}
export function getMediaElement(mediaType, url, mutedStories: boolean) {
    return mediaType === MediaType.Video
        ? `<video style="background:black;" height="450" src="${url}" controls preload="metadata"${mutedStories ? " muted" : ""}></video>`
        : `<img src="${url}" />`
}
export async function getMediaInfo(el: HTMLElement, postId: string, userId: string): Promise<any> {
    if (!postId) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId })
    }
    if (window.location.pathname.startsWith("/stories/highlights/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: null })
    } else if (window.location.pathname.startsWith("/stories/")) {
        return await fetchDataFromApi({ type: 'getReelsMediaFromFeed', articleNode: el, id: userId })
    } else {
        return await fetchDataFromApi({ type: 'getMediaFromInfo', articleNode: el })
    }
}
export function processMediaInfo(mediaInfo, callback) {
    console.log("processMediaInfo() mediaInfo", mediaInfo)
    let count = 0
    if (mediaInfo.reels_media && mediaInfo.reels_media.length > 0 && mediaInfo.reels_media[0].items) {
        mediaInfo.reels_media[0].items.forEach(callback)
        count = mediaInfo.reels_media[0].items.length
    } else if (mediaInfo.items && mediaInfo.items.length > 0 && mediaInfo.items[0].carousel_media) {
        mediaInfo.items[0].carousel_media.forEach(callback)
        count = mediaInfo.items[0].carousel_media.length
    } else if (mediaInfo.items && mediaInfo.items.length > 0) {
        callback(mediaInfo.items[0], 0)
        count = 1
    } else {
        if (mediaInfo && mediaInfo.user.hd_profile_pic_url_info.url) {
            callback(mediaInfo.user.hd_profile_pic_url_info, 0)
            count = 1
        }
    }
    return count
}
export function removeStyleTagsWithIDs(idsToRemove) {
    const styleTags = document.querySelectorAll("style[id]")
    styleTags.forEach(styleTag => {
        if (idsToRemove.includes(styleTag.id)) {
            styleTag.parentNode.removeChild(styleTag)
        }
    })
}
export function resolveCurrentSliderIndex(el: HTMLElement): number {
    // If the element is null, return -1 immediately
    if (!el) {
        return 0
    }
    // Define an array of possible selectors for the slides root
    const selectors = [
        ".x1ned7t2.x78zum5",
        "section header div",
        "section > div header > div",
        "section > div > div > div > div > div > div > div > div",
        "div > div > div > div > div > div > div > div"
    ]

    // Attempt to find the root element using each selector
    let slidesRoot: { children: Iterable<unknown> | ArrayLike<unknown> }
    for (const selector of selectors) {
        slidesRoot = el.querySelector(selector)
        if (slidesRoot) {
            break
        }
    }

    // Collect all child elements of the root, if any
    const slidesChildren: HTMLElement[] = slidesRoot ? Array.from(slidesRoot.children) as HTMLElement[] : []

    // Find the index of the first child with nested elements
    for (let i = 0; i < slidesChildren.length; i++) {
        // Get all div elements inside each child
        const allDivs = slidesChildren[i].querySelectorAll("div")
        for (const div of Array.from(allDivs)) {
            const widthStyle = div.style.width
            const transformStyle = div.style.transform
            // Check for width not 100% or any transform property present
            if ((widthStyle && widthStyle !== "100%") || (transformStyle && transformStyle.trim() !== "")) {
                // Check if stories are older than 24 hours and decrement from the index

                return i //- resolveExpiredStories(slidesRoot)  // Return the index of the selected slider
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
export function resolveElementMediaType(mediaArray) {
    if (mediaArray.carousel_media !== undefined) {
        return MediaType.Carousel
    } else if (mediaArray.video_dash_manifest !== undefined) {
        return MediaType.Video
    }
    else {
        return MediaType.Image
    }
}
export function resolveOverallMediaType() {
    // Logic to determine overall media type from mediaInfo
    return MediaType.UNDEFINED // Example placeholder
}
export async function secureFetch(url, appId) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: '*/*', 'X-IG-App-ID': appId },
            credentials: 'include',
            mode: 'cors',
        })
        console.log('response', response)

        if (response.status !== 200) {
            console.log(`Fetch API failed with status code: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (e) {
        console.log(`Error fetching data: ${e}\n${e.stack}`)
        return null
    }
}
export function sleep(ms: number): Promise<void> {
    return new Promise(function (resolve) { setTimeout(resolve, ms) })
}
export function userFilenameFormatter(filename: string, placeholders: Record<string, string>): string {
    // Replace placeholders with corresponding values
    for (const placeholder in placeholders) {
        const regex = new RegExp(`{${placeholder}}`, "g")
        filename = filename.replace(regex, placeholders[placeholder])
    }

    // Replace spaces with dashes (-)
    filename = filename.replace(/\s+/g, "-")

    // Remove any special characters except dashes, underscores, and dots
    filename = filename.replace(/[^\w-.]/g, "")

    return filename
}
export function wrapInSliderContainer(modalBody) {
    return `<div class="slider-container"><div class="slider">${modalBody}</div><div class="slider-controls"></div></div>`
}
export function resolveUserLink(rootUrl, path, userName) {
    if (path.startsWith("/p/") || path.startsWith("/stories/")) {
        return `${rootUrl}/${userName}/`
    } else if (path.startsWith("/reels/")) {
        return `${rootUrl}/${userName}/reels/`
    }
    return null
}