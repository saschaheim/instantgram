import { Program } from "./App";
import { MediaScanner } from "./modules/MediaScanner";
import { getBrowserInfo } from "./helpers/utils";
//import VersionUpdater from "./modules/Update";

console.clear(); // Clear the console to ensure a clean output when the app starts

// Define constants for the application
const APP_NAME = "instantgram"; // Application name
const DEVELOPMENT = process.env.DEV as unknown as boolean ?? false; // Boolean flag indicating if the app is running in development mode
const VERSION = process.env.VERSION as string; // Get the version from environment variables
const STORAGE_NAME = APP_NAME.toLowerCase().replace(/-/g, "_"); // Storage key used in localStorage (converted to lowercase)

// Define the program object that holds all the app's configuration and state
export const program: Program = {
    NAME: APP_NAME, // Set the application name
    STORAGE_NAME: STORAGE_NAME, // Set the storage name used for localStorage keys
    DEVELOPMENT: DEVELOPMENT, // Set the development flag to enable developer mode features
    VERSION: VERSION, // Set the application version
    browser: getBrowserInfo(), // Retrieve the browser information (name, version)
    hostname: window.location.hostname, // Get the current hostname (e.g., "instagram.com")
    path: window.location.pathname, // Get the current path (e.g., "/stories/highlights/123")

    // Regular expressions used for matching specific URL paths
    regexHostname: /^instagram\.com$/, // Regex to match the Instagram hostname
    regexRootPath: /^\/+$/, // Regex to match the root path (e.g., "/")
    regexProfilePath: /^\/(\w[-\w.]+)\/?$/, // Regex to match Instagram profile paths (e.g., "/username/")
    regexPostPath: /^\/p\//, // Regex to match Instagram post paths (e.g., "/p/post_id/")
    regexReelURI: /reel\/(.*)+/, // Regex to match Instagram reel URLs (e.g., "/reel/reel_id/")
    regexReelsURI: /reels\/(.*)+/, // Regex to match Instagram reels URLs (e.g., "/reels/reel_id/")
    regexStoriesURI: /\/stories\/(\w+)|\/highlights\/(\d+)\//, // Regex to match Instagram stories and highlights URLs

    foundByModule: null, // Initially set to null, stores the module that found the current media

    // User settings, fetched from localStorage to persist across sessions
    settings: {
        showAds: localStorage.getItem(`${STORAGE_NAME}_settings_general_1`) === "true", // User preference for showing ads
        openInNewTab: localStorage.getItem(`${STORAGE_NAME}_settings_general_2`) === "true", // Open links in new tab setting
        autoSlideshow: localStorage.getItem(`${STORAGE_NAME}_settings_general_3`) === "true", // Auto slideshow setting
        formattedFilenameInput: localStorage.getItem(`${STORAGE_NAME}_settings_general_4`) || "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}", // Filename format for downloaded files
        storiesMuted: localStorage.getItem(`${STORAGE_NAME}_settings_stories_1`) === "true", // Mute stories by default setting
        noMultiStories: localStorage.getItem(`${STORAGE_NAME}_settings_stories_3`) === "true" // Prevent multiple stories from being shown at once
    }
};

// If the app is running in development mode, log relevant information for debugging
if (DEVELOPMENT) {
    console.info(["Developer Mode Caution!", program]); // Log the program object for debugging
    if (program.browser) {
        console.info(["Browser Name", program.browser.name]); // Log the browser name
        console.info(["Browser Version", program.browser.version]); // Log the browser version
        console.info(["Browser OS", navigator.platform]); // Log the operating system of the browser
    }
}

/**
 * The main function to run the application.
 * It initializes the MediaScanner and performs media scanning.
 */
const runApp = async () => {
    const scanner = new MediaScanner(); // Create a new instance of the MediaScanner
    scanner.execute(program); // Execute the MediaScanner with the program configuration

    // Uncomment the following code to check for updates if not in development mode
    // if (!DEVELOPMENT) {
    //     const updater = new VersionUpdater(program); // Create an instance of VersionUpdater
    //     await updater.check(VERSION); // Check for version updates
    // }
};

// Start the application
runApp();