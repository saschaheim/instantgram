import { Program } from "./App"
import { MediaScanner } from "./modules/MediaScanner"
import { getBrowserInfo } from "./helpers/utils"
import VersionUpdater from "./modules/Update"
console.clear()
const APP_NAME = "instantgram"
const DEVELOPMENT = process.env.DEV as unknown as boolean ?? false
const VERSION = process.env.VERSION as string
const STORAGE_NAME = APP_NAME.toLowerCase().replace(/-/g, "_")
export const program: Program = {
    NAME: APP_NAME,
    STORAGE_NAME: STORAGE_NAME,
    DEVELOPMENT: DEVELOPMENT,
    VERSION: VERSION,
    browser: getBrowserInfo(),
    hostname: window.location.hostname,
    path: window.location.pathname,
    regexHostname: /^instagram\.com$/,
    regexRootPath: /^\/+$/,
    regexProfilePath: /^\/(\w[-\w.]+)\/?$/,
    regexPostPath: /^\/p\//,
    regexReelURI: /reel\/(.*)+/,
    regexReelsURI: /reels\/(.*)+/,
    regexStoriesURI: /\/stories\/(\w+)|\/highlights\/(\d+)\//,
    foundByModule: null,
    settings: {
        showAds: localStorage.getItem(`${STORAGE_NAME}_settings_general_1`) === "true",
        openInNewTab: localStorage.getItem(`${STORAGE_NAME}_settings_general_2`) === "true",
        autoSlideshow: localStorage.getItem(`${STORAGE_NAME}_settings_general_3`) === "true",
        formattedFilenameInput: localStorage.getItem(`${STORAGE_NAME}_settings_general_4`) || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}",
        storiesMuted: localStorage.getItem(`${STORAGE_NAME}_settings_stories_1`) === "true",
        noMultiStories: localStorage.getItem(`${STORAGE_NAME}_settings_stories_3`) === "true"
    }
}
if (DEVELOPMENT) {
    console.info(["Developer Mode Caution!", program])
    if (program.browser) {
        console.info(["Browser Name", program.browser.name])
        console.info(["Browser Version", program.browser.version])
        console.info(["Browser OS", navigator.platform])
    }
}
const runApp = async () => {
    const scanner = new MediaScanner()
    scanner.execute(program)
    // if (!DEVELOPMENT) {
    //     const updater = new VersionUpdater(program)
    //     await updater.check(VERSION)
    // }
}
runApp()