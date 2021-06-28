export type Program = {
  VERSION: string;

  hostname: string;
  path: string;

  regexHostname: RegExp;
  regexRootPath: RegExp;
  regexProfilePath: RegExp;
  regexPostPath: RegExp;
  regexStoriesURI: RegExp;

  foundByModule: null | string;
  foundVideo: boolean;
  foundImage: boolean;
  foundProfile: boolean;
}