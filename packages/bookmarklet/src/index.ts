import { Program } from "./App";
import { getBrowserInfo } from "./helpers/common";
import { embeddedLocales } from "./localization";
import localize, { getLocale, isInstagramHost, loadLocale } from "./helpers/localize";
import { MediaScanner } from "./modules/MediaScanner";
import VersionUpdater from "./modules/Update";

// Define constants for the application
const APP_NAME = "instantgram"; // Application name
const DOM_PREFIX = "instg"; // Prefix for generated DOM IDs and CSS classes
const DEVELOPMENT = process.env.DEV as unknown as boolean ?? false; // Boolean flag indicating if the app is running in development mode
const VERSION = process.env.VERSION as string; // Get the version from environment variables
const STORAGE_NAME = APP_NAME.toLowerCase().replace(/-/g, "_"); // Storage key used in localStorage (converted to lowercase)
const FIREFOX_LITE = process.env.FIREFOX_LITE as unknown as boolean ?? false;

// Define the program object that holds all the app's configuration and state
export const program: Program = {
    NAME: APP_NAME, // Set the application name
    DOM_PREFIX: DOM_PREFIX, // Set the DOM/CSS prefix used for generated markup
    STORAGE_NAME: STORAGE_NAME, // Set the storage name used for localStorage keys
    DEVELOPMENT: DEVELOPMENT, // Set the development flag to enable developer mode features
    VERSION: VERSION, // Set the application version
    browser: getBrowserInfo(),
    hostname: window.location.hostname, // Get the current hostname (e.g., "instagram.com")

    // Regular expressions used for matching specific URL paths
    regexRootPath: /^\/+$/, // Regex to match the root path (e.g., "/")
    regexProfilePath: /^\/(\w[-\w.]+)\/?$/, // Regex to match Instagram profile paths (e.g., "/username/")
    regexPostPath: /^\/p\/[^/]+\/?$/, // Regex to match Instagram post paths (e.g., "/p/post_id/")
    regexReelURI: /^\/reel\/[^/]+\/?$/, // Regex to match Instagram reel URLs (e.g., "/reel/reel_id/")
    regexReelsURI: /^\/reels\/[^/]+\/?$/, // Regex to match Instagram reels URLs (e.g., "/reels/reel_id/")
    regexStoriesURI: /^\/stories\/(?:[\w.]+(?:\/\d+)?\/?|highlights\/\d+\/?)$/, // Regex to match Instagram stories and highlights URLs


    // User settings, fetched from localStorage to persist across sessions
    settings: {
        openInNewTab: localStorage.getItem(STORAGE_NAME+"_g2") === "true", // Open links in new tab setting
        autoSlideshow: localStorage.getItem(STORAGE_NAME+"_g3") === "true", // Auto slideshow setting
        videosMuted: localStorage.getItem(STORAGE_NAME+"_g5") === "true", // Mute regular videos by default
        autoExpand: localStorage.getItem(STORAGE_NAME+"_g6") === "true", // Auto expand media modal on open
        formattedFilenameInput: localStorage.getItem(STORAGE_NAME+"_g4") || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}", // Filename format for downloaded files
        storiesMuted: localStorage.getItem(STORAGE_NAME+"_s1") === "true", // Mute stories by default setting
        noMultiStories: localStorage.getItem(STORAGE_NAME+"_s3") === "true" // Prevent multiple stories from being shown at once
    }
};

/**
 * The main function to run the application.
 * It initializes the MediaScanner and performs media scanning.
 */
const runApp = async () => {
    await loadLocale(getLocale());
    console.info(localize("h.ld"));
    console.info(["Developer Mode Caution!", program]);
    console.info(["Browser Name", program.browser.name]);
    console.info(["Browser Version", program.browser.version]);
    console.info(["Browser OS", navigator.platform]);
    if (!embeddedLocales && !isInstagramHost()) {
        console.info(FIREFOX_LITE
            ? "[instantgram] Languages require instagram.com"
            : "[instantgram] Additional languages and update checks are only available on instagram.com");
    }

    const scanner = new MediaScanner(); // Create a new instance of the MediaScanner
    await scanner.execute(program); // Execute the MediaScanner with the program configuration

    if (!DEVELOPMENT && isInstagramHost()) {
        const updater = new VersionUpdater(program); // Create an instance of VersionUpdater
        await updater.check(VERSION); // Check for version updates
    }
};

// Start the application
runApp();
