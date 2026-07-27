const path = require("path");
const fs = require("fs");

const FIREFOX_LIMIT = 65536;
const bookmarkletsPath = path.resolve(__dirname, "../dist/bookmarklets.json");

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

for (const [lang, href] of Object.entries(bookmarklets)) {
  const length = href.length;
  const delta = length - FIREFOX_LIMIT;
  const status = delta <= 0 ? `OK (${Math.abs(delta)} under)` : `TOO LARGE (${delta} over)`;
  console.log(`${lang}: ${length} - ${status}`);
}
