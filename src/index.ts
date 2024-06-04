import { Program } from "./App"
import { MediaScanner } from "./modules/MediaScanner"
import { Modal } from "./components/Modal"
import { getBrowserInfo } from "./helpers/utils"
import VersionUpdater from "./modules/Update"
import localize from "./helpers/localize"

console.clear()

const APP_NAME = "instantgram"
const VERSION = process.env.VERSION as string
const STORAGE_NAME = APP_NAME.toLowerCase().replace(/-/g, "_")
export const program: Program = {
    NAME: APP_NAME,
    STORAGE_NAME: STORAGE_NAME,
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
    foundByModule: null
}

if (process.env.DEV) {
    console.info(["Developer Mode Caution!", program])
    if (program.browser) {
        console.info(["Browser Name", program.browser.name])
        console.info(["Browser Version", program.browser.version])
        console.info(["Browser OS", navigator.platform])
    }
}

const runApp = async () => {
    if (!program.hostname.includes("instagram.com")) {
        new Modal({
            heading: [`<h5><span class="header-text-left">[${program.NAME}]</span><span class="header-text-right" style="margin-right: 0">v${program.VERSION}</span></h5>`],
            body: [localize("index@alert_onlyWorks")],
            bodyStyle: "text-align:center",
            buttonList: [{ active: true, text: "Ok" }]
        }).open()
        return
    }
    const scanner = new MediaScanner()
    scanner.execute(program)
    if (!process.env.DEV) {
        const updater = new VersionUpdater(program)
        await updater.update(VERSION)
    }
}
runApp()