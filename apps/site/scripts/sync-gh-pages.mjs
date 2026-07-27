import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve(process.cwd(), "dist");
const repoRoot = path.resolve(process.cwd(), "../..");
const docsDir = path.join(repoRoot, "docs");

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });

    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }

    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

for (const target of ["docs", "index.html", "lang", "img", "stylesheets"]) {
  removeIfExists(path.join(repoRoot, target));
}

for (const entry of fs.readdirSync(sourceDir)) {
  copyRecursive(path.join(sourceDir, entry), path.join(docsDir, entry));
}
