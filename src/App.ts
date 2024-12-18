/**
 * Program represents the configuration and state information for the application.
 * This type includes details such as the app's version, browser info, regex patterns,
 * and user-specific settings for controlling the application's behavior.
 */
export type Program = {
  /**
   * The name of the application.
   * Example: 'InstagramMediaScanner'
   */
  NAME: string;

  /**
   * The key used for storing and retrieving application data from local storage.
   * Example: 'instagram_media_scanner_storage'
   */
  STORAGE_NAME: string;

  /**
   * A flag indicating whether the application is in development mode.
   * Useful for enabling development-specific features or settings.
   */
  DEVELOPMENT: boolean;

  /**
   * The current version of the application.
   * Example: '1.0.0'
   */
  VERSION: string;

  /**
   * The browser's name and version being used to run the application.
   * Example: { name: 'Chrome', version: '91.0.4472.124' }
   */
  browser: { name: string, version: string };

  /**
   * The hostname of the current webpage or application.
   * Example: 'www.instagram.com'
   */
  hostname: string;

  /**
   * The path of the current URL.
   * Example: '/stories/highlights/12345/'
   */
  path: string;

  /**
   * A regular expression pattern to match the hostname (e.g., to verify if it’s Instagram).
   * Example: /^www\.instagram\.com$/
   */
  regexHostname: RegExp;

  /**
   * A regular expression pattern to match the root path of the website.
   * Example: /^\/?$/
   */
  regexRootPath: RegExp;

  /**
   * A regular expression pattern to match the profile path (e.g., '/profile/username').
   * Example: /^\/profile\/[a-zA-Z0-9_]+$/
   */
  regexProfilePath: RegExp;

  /**
   * A regular expression pattern to match a post path (e.g., '/p/post_id').
   * Example: /^\/p\/[a-zA-Z0-9_-]+$/
   */
  regexPostPath: RegExp;

  /**
   * A regular expression pattern to match a reel URI (e.g., '/reel/reel_id').
   * Example: /^\/reel\/[a-zA-Z0-9_-]+$/
   */
  regexReelURI: RegExp;

  /**
   * A regular expression pattern to match reels URI (e.g., '/reels/reel_id').
   * Example: /^\/reels\/[a-zA-Z0-9_-]+$/
   */
  regexReelsURI: RegExp;

  /**
   * A regular expression pattern to match stories URI (e.g., '/stories/story_id').
   * Example: /^\/stories\/[a-zA-Z0-9_-]+$/
   */
  regexStoriesURI: RegExp;

  /**
   * The module that found the current media (e.g., 'FeedScanner', 'ReelsScanner').
   * This is useful for identifying which module was responsible for identifying a piece of media.
   */
  foundByModule: string | null | undefined;

  /**
   * Settings related to the user's preferences for the application.
   */
  settings: {
    /**
     * Flag to determine if advertisements should be shown in the app.
     * When set to `false`, ads will not be displayed.
     */
    showAds: boolean;

    /**
     * Flag to determine whether links should open in a new tab.
     * When set to `true`, links will open in a new browser tab.
     */
    openInNewTab: boolean;

    /**
     * Flag to enable or disable the auto-slideshow feature.
     * When set to `true`, the slideshow will automatically advance.
     */
    autoSlideshow: boolean;

    /**
     * The format used for generating filenames. The placeholders in this string are replaced with actual data.
     * Example: '{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}'
     */
    formattedFilenameInput: string;

    /**
     * Flag to mute stories by default.
     * When set to `true`, all stories will start muted.
     */
    storiesMuted: boolean;

    /**
     * Flag to prevent multiple stories from being shown at once.
     * When set to `true`, only one story will be displayed at a time.
     */
    noMultiStories: boolean;
  }
};