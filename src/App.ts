export type Program = {
  NAME: string
  STORAGE_NAME: string
  DEVELOPMENT: boolean
  VERSION: string
  browser: { name: string, version: string }
  hostname: string
  path: string
  regexHostname: RegExp
  regexRootPath: RegExp
  regexProfilePath: RegExp
  regexPostPath: RegExp
  regexReelURI: RegExp
  regexReelsURI: RegExp
  regexStoriesURI: RegExp
  foundByModule: string | null | undefined
  settings: {
    showAds: boolean,
    openInNewTab: boolean,
    autoSlideshow: boolean,
    formattedFilenameInput: string,
    storiesMuted: boolean,
    noMultiStories: boolean
  }
}