const fs = require("fs");
const path = require("path");
const UglifyJS = require("uglify-js");

const root = path.resolve(__dirname, "..", "..", "..");

const sources = [
  {
    name: "preact",
    file: path.join(root, "node_modules", "preact", "dist", "preact.min.module.js"),
    alreadyMinified: true,
  },
  {
    name: "preact-hooks",
    file: path.join(root, "node_modules", "preact", "hooks", "dist", "hooks.module.js"),
    alreadyMinified: false,
  },
  {
    name: "preact-compat",
    file: path.join(root, "node_modules", "preact", "compat", "dist", "compat.module.js"),
    alreadyMinified: false,
  },
];

for (const source of sources) {
  const code = fs.readFileSync(source.file, "utf8");
  const minified = source.alreadyMinified
    ? code
    : UglifyJS.minify(code, {
        compress: true,
        mangle: true,
        module: true,
      }).code;

  const bookmarklet = `javascript:(function(){;${encodeURI(minified)}})()`;

  console.log(
    [
      source.name,
      `bytes=${Buffer.byteLength(minified, "utf8")}`,
      `bookmarklet_chars=${bookmarklet.length}`,
    ].join("\t"),
  );
}
