import { MediaType } from "./MediaType"; // Importing the MediaType type for media classification

/**
 * MediaScanResult represents the result of a media scan.
 * It contains information about the scanned media, such as whether it was found,
 * the module that found it, media type, and any additional information required for display.
 */
export interface MediaScanResult {
    /**
     * Indicates whether the media was found during the scan.
     * This is useful for conditionally displaying results or error messages.
     * @example true
     */
    found?: boolean;

    /**
     * The module that found the media (e.g., 'FeedScanner', 'StoriesScanner').
     * This helps identify which part of the application was responsible for finding the media.
     * @example "FeedScanner"
     */
    foundByModule?: string;

    /**
     * The type of media found (e.g., photo, video, reel, story).
     * This helps categorize the media for specific handling or presentation.
     * @see MediaType for possible values.
     * @example "photo"
     */
    mediaType?: MediaType;

    /**
     * Additional media information (e.g., metadata, dimensions, video duration).
     * This can be an object or null if there is no additional information.
     * @example { duration: "30s", dimensions: { width: 1920, height: 1080 } }
     */
    mediaInfo?: object | null | undefined;

    /**
     * The body content for the modal that is displayed to the user.
     * This typically contains HTML or text content that provides information about the media.
     * @example "<p>Media information here...</p>"
     */
    modalBody?: string;

    /**
     * The index of the selected slide in a media carousel or slideshow.
     * This is used when displaying multiple media items in a slider format.
     * @example 2 (indicating the third item in the slider)
     */
    selectedSliderIndex?: number;

    /**
     * The username of the media owner or creator.
     * This is used for displaying user-related information.
     * @example "john_doe"
     */
    userName?: string;

    /**
     * The link to the media owner's profile or the media itself.
     * This is useful for creating clickable links to the user's profile or media page.
     * @example "https://www.instagram.com/john_doe/"
     */
    userLink?: string;

    /**
     * An error message that provides details about any issue encountered during the media scan.
     * This is typically displayed to the user when something goes wrong.
     * @example "Error: Media not found."
     */
    errorMessage?: string;

    /**
     * An object representing the error details.
     * This can be used for debugging purposes and is usually logged to the console.
     * @example { message: "Media not found", code: 404 }
     */
    error?: object;
}