import bookmarklets from "../generated/bookmarklets.json";

export type BookmarkletMap = Record<string, string>;

export function readBookmarklets(): BookmarkletMap {
  return bookmarklets as BookmarkletMap;
}
