import { BrowserInfo, SearchBotDeviceInfo, BotInfo, NodeInfo, ReactNativeInfo } from "detect-browser"

export type Program = {
  VERSION: string

  browser: BrowserInfo | SearchBotDeviceInfo | BotInfo | NodeInfo | ReactNativeInfo | null

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