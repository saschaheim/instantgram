const path = require("path");

const FIREFOX_LIMIT = 65536;
const bookmarkletsPath = path.resolve(__dirname, "../src/_langs/bookmarklets.js");

let bookmarklets;

try {
  delete require.cache[bookmarkletsPath];
  bookmarklets = require(bookmarkletsPath);
} catch (error) {
  console.error("[instantgram] Could not read generated bookmarklets.");
  console.error("[instantgram] Run `npm run build:bookmarklet` first.");
  process.exitCode = 1;
  return;
}

console.log(`[instantgram] Firefox bookmarklet limit: ${FIREFOX_LIMIT}`);

for (const [lang, href] of Object.entries(bookmarklets)) {
  const length = href.length;
  const delta = length - FIREFOX_LIMIT;
  const status = delta <= 0 ? `OK (${Math.abs(delta)} under)` : `TOO LARGE (${delta} over)`;
  console.log(`${lang}: ${length} - ${status}`);
}
