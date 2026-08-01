import bookmarklets from "../generated/bookmarklets.json";
import firefoxBookmarklets from "../generated/firefox-bookmarklets.json";

export type BookmarkletMap = Record<string, string>;

export function readBookmarklets(): BookmarkletMap {
  return bookmarklets as BookmarkletMap;
}

export function readFirefoxBookmarklets(): BookmarkletMap {
  return firefoxBookmarklets as BookmarkletMap;
}
