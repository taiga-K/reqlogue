#!/usr/bin/env node
// Ensures shared/ui and organisms (templates/pages) have sibling stories.
// Plugin-specific convention. Verified: 2026-09-12.
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve("src");

const skip = (p) =>
  p.includes(".stories.") ||
  p.includes(".test.") ||
  p.includes(".spec.") ||
  p.includes(".example.") ||
  p.endsWith("index.tsx");

const requiredGlobs = [
  { match: (p) => /(?:^|\/)shared\/ui\//.test(p) && p.endsWith(".tsx") && !skip(p) },
  { match: (p) => /\/ui\/organisms\//.test(p) && p.endsWith(".tsx") && !skip(p) },
  { match: (p) => /\/ui\/(?:templates|pages)\//.test(p) && p.endsWith(".tsx") && !skip(p) },
];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await walk(full, out);
    } else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = await walk(root);
const relative = files.map((f) => path.relative(root, f).split(path.sep).join("/"));
const missing = [];

for (const file of relative) {
  if (!requiredGlobs.some((g) => g.match(file))) continue;
  const story = file.replace(/\.tsx$/, ".stories.tsx");
  const storyPath = path.join(root, story);
  try {
    await stat(storyPath);
  } catch {
    missing.push(`${file} -> missing ${story}`);
  }
}

if (missing.length) {
  console.error("check-stories failed:\n" + missing.join("\n"));
  process.exit(1);
}

console.log(`check-stories passed (${relative.length} files scanned under ${root})`);
