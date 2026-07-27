import { Program } from "../../src/App";

export const createTestProgram = (overrides: Partial<Program["settings"]> = {}): Program => ({
    NAME: "Instantgram",
    DOM_PREFIX: "instg",
    STORAGE_NAME: "instantgram_test",
    DEVELOPMENT: false,
    VERSION: "test",
    browser: { name: "test", version: "1.0" },
    hostname: "www.instagram.com",
    regexRootPath: /^\/+$/,
    regexProfilePath: /^\/(\w[-\w.]+)\/?$/,
    regexPostPath: /^\/p\/[^/]+\/?$/,
    regexReelURI: /^\/reel\/[^/]+\/?$/,
    regexReelsURI: /^\/reels\/[^/]+\/?$/,
    regexStoriesURI: /^(?:\/stories\/[\w.]+(?:\/\d+)?\/?|\/stories\/highlights\/\d+\/?)$/,
    settings: {
        showAds: false,
        openInNewTab: false,
        autoSlideshow: false,
        videosMuted: true,
        autoExpand: false,
        formattedFilenameInput: "{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}",
        storiesMuted: true,
        noMultiStories: false,
        ...overrides,
    },
});
