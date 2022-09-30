export type Program = {
  VERSION: string

  browser: any

  hostname: string
  path: string

  regexHostname: RegExp
  regexRootPath: RegExp
  regexProfilePath: RegExp
  regexPostPath: RegExp
  regexStoriesURI: RegExp

  foundByModule: null | string
  foundVideo: boolean
  foundImage: boolean
  foundProfile: boolean
}