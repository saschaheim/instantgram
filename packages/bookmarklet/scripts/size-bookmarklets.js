const path = require("path");
const fs = require("fs");

const FIREFOX_LIMIT = 65536;
const firefoxBookmarkletsPath = path.resolve(__dirname, "../../../apps/site/src/generated/firefox-bookmarklets.json");

let firefoxBookmarklets;

try {
  firefoxBookmarklets = JSON.parse(fs.readFileSync(firefoxBookmarkletsPath, "utf8"));
} catch {
  console.error("[instantgram] Could not read generated Firefox Lite bookmarklets.");
  console.error("[instantgram] Run `pnpm --filter @instantgram/bookmarklet build:release` first.");
  process.exitCode = 1;
  return;
}

console.log(`[instantgram] Firefox Lite URL limit: ${FIREFOX_LIMIT}`);

const bookmarkletLength = (buttonHtml) => {
  const match = buttonHtml.match(/href="([^"]+)"/);
  if (!match) {
    throw new Error("Bookmarklet href not found");
  }
  const href = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  return href.length;
};

let oversized = false;

for (const [lang, href] of Object.entries(firefoxBookmarklets)) {
  const length = bookmarkletLength(href);
  const delta = length - FIREFOX_LIMIT;
  const status = delta <= 0 ? `OK (${Math.abs(delta)} under)` : `TOO LARGE (${delta} over)`;
  console.log(`${lang}: ${length} - ${status}`);
  oversized ||= delta > 0;
}

if (oversized) {
  process.exitCode = 1;
}
