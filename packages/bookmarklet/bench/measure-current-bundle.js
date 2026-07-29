const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const distFile = path.join(rootDir, "dist", "main.en-us.js");

function bookmarkletLength(code) {
  return `javascript:(function(){;${encodeURI(code)}})()`.length;
}

function measureCode(code) {
  return {
    bytes: Buffer.byteLength(code, "utf8"),
    bookmarkletChars: bookmarkletLength(code),
  };
}

function measureFile(filePath) {
  return measureCode(fs.readFileSync(filePath, "utf8"));
}

const current = measureFile(distFile);

const preactBase = path.dirname(require.resolve("preact/package.json"));
const preactFiles = {
  preact: path.join(preactBase, "dist", "preact.module.js"),
  hooks: path.join(preactBase, "hooks", "dist", "hooks.module.js"),
  compat: path.join(preactBase, "compat", "dist", "compat.module.js"),
};

const payloads = Object.fromEntries(
  Object.entries(preactFiles).map(([key, filePath]) => [key, measureFile(filePath)]),
);

function totalWith(...keys) {
  return keys.reduce(
    (acc, key) => {
      acc.bytes += payloads[key].bytes;
      acc.bookmarkletChars += payloads[key].bookmarkletChars;
      return acc;
    },
    { bytes: current.bytes, bookmarkletChars: current.bookmarkletChars },
  );
}

function print(label, stats) {
  console.log(
    `${label}: ${stats.bytes} bytes, ${stats.bookmarkletChars} bookmarklet chars, ${(stats.bytes / 1024).toFixed(2)} KB`,
  );
}

print("current", current);
print("current + preact", totalWith("preact"));
print("current + preact + hooks", totalWith("preact", "hooks"));
print("current + preact + compat", totalWith("preact", "compat"));

console.log("");
print("delta preact", payloads.preact);
print("delta hooks", payloads.hooks);
print("delta compat", payloads.compat);
