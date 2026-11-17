// Cache six exhibition photos into local /assets/uploads at build time.
// If a remote source is inaccessible, retain the CDN URL so the page still builds.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const casePath = "src/cases/2026-11-16-incheon-yeongjong-life-bloom-poster-exhibition.md";
const uploadDir = "src/assets/uploads";
const prefix = "20261116-incheon-life-bloom-exhibition";
let markdown = readFileSync(casePath, "utf8");
const urls = [...new Set(
  [...markdown.matchAll(/https:\/\/wsrv\.nl\/\?url=[^"\s]+/g)].map(m => m[0])
)];

if (urls.length === 0) {
  console.log("Incheon exhibition: no CDN photos left to cache.");
  process.exit(0);
}

function extension(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

async function download(url, i) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; OneBalloonWebsite/1.0)",
          "Accept": "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8"
        }
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      const ext = extension(bytes);
      if (!ext || bytes.length < 10000 || bytes.length > 15000000) {
        throw new Error("Invalid image data: " + bytes.length + " bytes");
      }
      return { url, bytes, ext, index: i };
    } catch (err) {
      console.warn("Incheon exhibition photo " + (i + 1) + ", attempt " + attempt + ": " + err);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

mkdirSync(uploadDir, { recursive: true });
const results = await Promise.all(urls.map(download));
for (const file of results) {
  if (!file) continue;
  const filename = prefix + "-" + String(file.index + 1).padStart(2, "0") + "." + file.ext;
  writeFileSync(join(uploadDir, filename), file.bytes);
  markdown = markdown.replaceAll(file.url, "/assets/uploads/" + filename);
}
writeFileSync(casePath, markdown, "utf8");
console.log("Incheon exhibition photos cached locally: " +
  results.filter(Boolean).length + "/" + urls.length +
  "; missing assets keep their CDN fallback URLs.");
