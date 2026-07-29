const path = require("path");
const fs = require("fs");

const FIREFOX_LIMIT = 65536;
const bookmarkletsPath = path.resolve(__dirname, "../dist/bookmarklets.json");
const firefoxBookmarkletsPath = path.resolve(__dirname, "../../../apps/site/src/generated/firefox-bookmarklets.json");

let bookmarklets = null;

try {
  bookmarklets = JSON.parse(fs.readFileSync(bookmarkletsPath, "utf8"));
} catch (error) {
  console.error("[instantgram] Could not read generated bookmarklets.");
  console.error("[instantgram] Run `pnpm --filter @instantgram/bookmarklet build:bookmarklet` first.");
  process.exitCode = 1;
  return;
}

console.log(`[instantgram] Firefox bookmarklet limit: ${FIREFOX_LIMIT}`);

const payloadLength = (buttonHtml) => {
  const match = buttonHtml.match(/href="([^"]+)"/);
  if (!match) {
    throw new Error("Bookmarklet href not found");
  }
  const href = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  return href.startsWith("javascript:") ? href.length - 11 : href.length;
};

for (const [lang, href] of Object.entries(bookmarklets)) {
  const length = payloadLength(href);
  const delta = length - FIREFOX_LIMIT;
  const status = delta <= 0 ? `OK (${Math.abs(delta)} under)` : `TOO LARGE (${delta} over)`;
  console.log(`${lang}: ${length} - ${status}`);
}

if (fs.existsSync(firefoxBookmarkletsPath)) {
  const firefoxBookmarklets = JSON.parse(fs.readFileSync(firefoxBookmarkletsPath, "utf8"));
  console.log("[instantgram] Firefox Lite:");
  for (const [lang, href] of Object.entries(firefoxBookmarklets)) {
    const length = payloadLength(href);
    const delta = length - FIREFOX_LIMIT;
    const status = delta <= 0 ? `OK (${Math.abs(delta)} under)` : `TOO LARGE (${delta} over)`;
    console.log(`${lang}: ${length} - ${status}`);
  }
}
