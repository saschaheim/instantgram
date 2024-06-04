export type Program = {
  NAME: string
  STORAGE_NAME: string
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
}