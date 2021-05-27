export type Program = {
  VERSION: string;

  context: {
    hasMsg: boolean;
    msg: string;
  };

  hostname: string;
  path: string;
  videos: NodeListOf<HTMLVideoElement>;

  regexHostname: RegExp;
  regexRootPath: RegExp;
  regexPostPath: RegExp;
  regexStoriesURI: RegExp;

  foundByModule: null | string;
  foundVideo: boolean;
  foundImage: boolean;
  imageLink: boolean | string;

  setImageLink: (link: string) => void;
}