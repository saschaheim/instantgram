/* eslint-disable */

/**
 * MediaType enum is used to categorize different types of media that the application can encounter.
 * This helps to easily classify and handle media based on its type (e.g., image, video, ad).
 */
export enum MediaType {
  /**
   * Represents an advertisement (ad).
   * Used when the scanned media is an advertisement.
   */
  Ad = "AD",

  /**
   * Represents an image media type.
   * Used when the scanned media is an image.
   */
  Image = "IMAGE",

  /**
   * Represents a video media type.
   * Used when the scanned media is a video.
   */
  Video = "VIDEO",

  /**
   * Represents a carousel of multiple media items (images or videos).
   * Used when the scanned media is a carousel, which can contain multiple images or videos in a slider.
   */
  Carousel = "CAROUSEL",

  /**
   * Represents an undefined media type.
   * This is a fallback value when the media type cannot be identified or is unknown.
   */
  UNDEFINED = "UNDEFINED",
}