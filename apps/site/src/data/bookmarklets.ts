import bookmarklets from "../generated/bookmarklets.json";
import firefoxBookmarklets from "../generated/firefox-bookmarklets.json";

export type BookmarkletMap = Record<string, string>;
export interface BookmarkletVariant {
  id: string;
  label: string;
  href: string;
  payloadChars: number;
}

export function readBookmarklets(): BookmarkletMap {
  return bookmarklets as BookmarkletMap;
}

export function readFirefoxBookmarklets(): BookmarkletMap {
  return firefoxBookmarklets as BookmarkletMap;
}

function decodeBookmarkletHref(bookmarkletHtml: string): string {
  const match = bookmarkletHtml.match(/href="([^"]+)"/);
  if (!match) {
    throw new Error("Bookmarklet href not found");
  }

  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function partialEncode(value: string, pattern: RegExp): string {
  return value.replace(pattern, (char) => encodeURIComponent(char));
}

export function buildFirefoxBookmarkletVariants(locale: string): BookmarkletVariant[] {
  const bookmarkletHtml = readBookmarklets()[locale];
  const href = decodeBookmarkletHref(bookmarkletHtml);
  const payload = href.startsWith("javascript:") ? href.slice(11) : href;
  const raw = decodeURIComponent(payload);
  const wrap = (value: string) => `(function(){;${value}})()`;

  const variants = [
    { id: "raw", label: "Raw", payload: wrap(raw) },
    { id: "spaces", label: "Only spaces", payload: wrap(partialEncode(raw, / /g)) },
    { id: "quotes", label: 'Only "', payload: wrap(partialEncode(raw, /"/g)) },
    { id: "spaces-quotes", label: 'Spaces + "', payload: wrap(partialEncode(partialEncode(raw, / /g), /"/g)) },
    { id: "braces", label: "Only {}", payload: wrap(partialEncode(raw, /[{}]/g)) },
    { id: "encode-uri", label: "Full encodeURI", payload: wrap(encodeURI(raw)) },
  ];

  return variants.map((entry) => ({
    ...entry,
    href: `javascript:${entry.payload}`,
    payloadChars: entry.payload.length,
  }));
}
